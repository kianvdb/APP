class LocalStorageManager {
    constructor() {
        this.dbName = 'ThreelyModelsDB';
        this.dbVersion = 2;
        this.stores = {
            savedModels: 'savedModels',
            recentModels: 'recentModels',
            cachedAssets: 'cachedAssets',
            syncQueue: 'syncQueue'
        };
        this.db = null;
        this.syncInProgress = false;
        this.syncWorker = null;
        this.initDB();
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized');
                this.startSyncWorker();
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    syncStore.createIndex('status', 'status', { unique: false });
                    syncStore.createIndex('retryCount', 'retryCount', { unique: false });
                }
                
                // Create other stores
                Object.values(this.stores).forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, { keyPath: 'id' });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('syncStatus', 'syncStatus', { unique: false });
                        
                        if (storeName === 'cachedAssets') {
                            store.createIndex('assetId', 'assetId', { unique: true });
                        }
                        
                        if (storeName === 'recentModels') {
                            store.createIndex('expiresAt', 'expiresAt', { unique: false });
                        }
                    }
                });
            };
        });
    }

    async saveModelLocally(modelData) {
        if (!this.db) await this.initDB();
        
        const modelEntry = {
            id: modelData.taskId || `local_${Date.now()}`,
            taskId: modelData.taskId,
            name: modelData.name || `Model ${new Date().toLocaleDateString()}`,
            timestamp: Date.now(),
            syncStatus: 'pending',
            cloudUrl: null,
            localData: {
                modelBlobs: modelData.modelBlobs || {},
                thumbnail: modelData.thumbnail,
                metadata: {
                    formats: modelData.formats || ['glb', 'fbx', 'obj', 'usdz'],
                    totalSize: Object.values(modelData.modelBlobs || {}).reduce((sum, blob) => sum + (blob?.size || 0), 0),
                    settings: modelData.settings,
                    polygons: modelData.polygons,
                    textured: modelData.textured
                }
            },
            formats: modelData.formats || ['glb', 'fbx', 'obj', 'usdz']
        };
        
        await this.saveToStore(this.stores.savedModels, modelEntry);
        
        await this.addToSyncQueue({
            id: `sync_${modelEntry.id}`,
            modelId: modelEntry.id,
            type: 'model',
            status: 'pending',
            retryCount: 0,
            data: modelEntry,
            createdAt: Date.now()
        });
        
        console.log('💾 Model saved locally with all formats, queued for sync');
        return modelEntry;
    }

    async addToSyncQueue(syncItem) {
        return await this.saveToStore(this.stores.syncQueue, syncItem);
    }

startSyncWorker() {
    // Sync disabled - models are already saved to cloud when generated
    console.log('📱 Local storage active - cloud backup disabled (models already saved via /from-meshy)');
    return;
}

    async processSyncQueue() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            const pendingItems = await this.getPendingSyncItems();
            
            if (pendingItems.length === 0) {
                this.syncInProgress = false;
                return;
            }
            
            console.log(`☁️ Processing ${pendingItems.length} items in sync queue`);
            
            for (const item of pendingItems) {
                if (item.retryCount > 3) {
                    item.status = 'failed';
                    await this.saveToStore(this.stores.syncQueue, item);
                    continue;
                }
                
                try {
                    await this.syncItemToCloud(item);
                    await this.deleteFromStore(this.stores.syncQueue, item.id);
                    
                    const model = await this.getFromStore(this.stores.savedModels, item.modelId);
                    if (model) {
                        model.syncStatus = 'synced';
                        await this.saveToStore(this.stores.savedModels, model);
                    }
                } catch (error) {
                    console.warn(`Sync failed for ${item.id}, will retry`);
                    item.retryCount++;
                    await this.saveToStore(this.stores.syncQueue, item);
                }
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    async getPendingSyncItems() {
        const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
        const store = transaction.objectStore(this.stores.syncQueue);
        const index = store.index('status');
        const request = index.getAll('pending');
        
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
        });
    }

    async syncItemToCloud(syncItem) {
        const apiUrl = this.getApiBaseUrl();
        const formData = new FormData();
        
        if (syncItem.data.localData.modelBlobs) {
            for (const [format, blob] of Object.entries(syncItem.data.localData.modelBlobs)) {
                if (blob && blob.size < 50 * 1024 * 1024) {
                    formData.append(`model_${format}`, blob, `model.${format}`);
                }
            }
        }
        
        if (syncItem.data.localData.thumbnail) {
            formData.append('thumbnail', syncItem.data.localData.thumbnail, 'thumbnail.jpg');
        }
        
        formData.append('metadata', JSON.stringify({
            taskId: syncItem.data.taskId,
            name: syncItem.data.name,
            settings: syncItem.data.localData.metadata.settings,
            formats: syncItem.data.localData.metadata.formats,
            totalSize: syncItem.data.localData.metadata.totalSize
        }));
        
        const response = await fetch(`${apiUrl}/saveAsset`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Cloud sync failed: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`✅ Synced to cloud: ${syncItem.modelId}`);
        return result;
    }

    async getLocalModel(modelId) {
        if (!this.db) await this.initDB();
        return await this.getFromStore(this.stores.savedModels, modelId);
    }

    async getAllLocalModels() {
        if (!this.db) await this.initDB();
        return await this.getAllFromStore(this.stores.savedModels);
    }

    async deleteLocalModel(modelId) {
        if (!this.db) await this.initDB();
        await this.deleteFromStore(this.stores.savedModels, modelId);
        console.log('✅ Model deleted locally:', modelId);
    }

    // Add these methods for caching gallery assets
    async cacheAsset(assetData) {
        const store = this.stores.cachedAssets;
        assetData.id = `asset_${assetData.assetId}`;
        
        const cached = await this.getAllFromStore(store);
        if (cached.length >= 20) {
            const sortedByTime = cached.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = sortedByTime.slice(0, cached.length - 19);
            
            for (const item of toDelete) {
                await this.deleteFromStore(store, item.id);
                console.log('🧹 Removed old cached asset:', item.id);
            }
        }
        
        return await this.saveToStore(store, assetData);
    }

    async getCachedAsset(assetId) {
        const store = this.stores.cachedAssets;
        return await this.getFromStore(store, `asset_${assetId}`);
    }

    async deleteCachedAsset(assetId) {
        const store = this.stores.cachedAssets;
        return await this.deleteFromStore(store, `asset_${assetId}`);
    }

    async saveToStore(storeName, data) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(data);
            request.onerror = () => reject(request.error);
        });
    }

    async getFromStore(storeName, id) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFromStore(storeName) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const items = request.result;
                items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromStore(storeName, id) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncStatus() {
        const syncQueue = await this.getAllFromStore(this.stores.syncQueue);
        const pending = syncQueue.filter(item => item.status === 'pending');
        const failed = syncQueue.filter(item => item.status === 'failed');
        
        return {
            pending: pending.length,
            failed: failed.length,
            syncing: this.syncInProgress,
            online: navigator.onLine
        };
    }

    getApiBaseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDev) {
            return `http://${hostname}:3000/api`;
        } else {
            return protocol === 'https:' ? `https://${hostname}/api` : `http://${hostname}:3000/api`;
        }
    }

    stopSyncWorker() {
        if (this.syncWorker) {
            clearInterval(this.syncWorker);
            this.syncWorker = null;
        }
    }
}

// Initialize LocalStorageManager
window.LocalStorageManager = new LocalStorageManager();

// Network event listeners
window.addEventListener('online', () => {
    console.log('📶 Back online - processing sync queue');
    window.LocalStorageManager.processSyncQueue();
});

window.addEventListener('offline', () => {
    console.log('📵 Offline - sync paused');
});

// LocalModelViewer class in the same file
class LocalModelViewer {
    async openLocalModel(modelId) {
        try {
            const model = await window.LocalStorageManager.getLocalModel(modelId);
            if (!model) {
                console.error('Model not found');
                return;
            }
            
            // Open in MobileAssetViewer with local model
            if (window.MobileAssetViewer) {
                window.MobileAssetViewer.openLocalModel(modelId);
            } else {
                // Fallback: show format options
                this.showFormatOptions(model);
            }
            
        } catch (error) {
            console.error('Error opening local model:', error);
        }
    }
    
    showFormatOptions(model) {
        const formats = model.localData.modelBlobs;
        console.log('Available formats:', Object.keys(formats));
        
        // Create download modal
        const modal = document.createElement('div');
        modal.className = 'download-format-modal active';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="download-modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="download-modal-content">
                <div class="download-modal-header">
                    <h3>Download Model</h3>
                    <button class="close-btn" onclick="this.closest('.download-format-modal').remove()">×</button>
                </div>
                <div class="download-formats-grid">
                    ${Object.entries(formats).map(([format, blob]) => blob ? `
                        <button class="format-option-btn" onclick="window.LocalModelViewer.downloadFormat('${model.id}', '${format}', '${model.name}')">
                            <div class="format-icon">${this.getFormatIcon(format)}</div>
                            <div class="format-name">${format.toUpperCase()}</div>
                            <div class="format-desc">${(blob.size / 1024 / 1024).toFixed(1)} MB</div>
                        </button>
                    ` : '').join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    async downloadFormat(modelId, format, modelName) {
        const model = await window.LocalStorageManager.getLocalModel(modelId);
        const blob = model.localData.modelBlobs[format];
        
        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${modelName}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        document.querySelector('.download-format-modal')?.remove();
    }
    
    getFormatIcon(format) {
        const icons = {
            glb: '📦',
            fbx: '🎮',
            obj: '🔷',
            usdz: '🍎'
        };
        return icons[format] || '📄';
    }
}

// Initialize LocalModelViewer
window.LocalModelViewer = new LocalModelViewer();