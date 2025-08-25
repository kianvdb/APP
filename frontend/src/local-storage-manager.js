/**
 * LocalStorageManager.js
 * 
 * Handles offline storage, caching, and synchronization of 3D models
 * using IndexedDB for persistent local storage and background sync
 */

'use strict';

/* ========================================
   Constants and Configuration
   ======================================== */
const DB_CONFIG = {
    name: 'ThreelyModelsDB',
    version: 2,
    stores: {
        savedModels: 'savedModels',
        recentModels: 'recentModels',
        cachedAssets: 'cachedAssets',
        syncQueue: 'syncQueue'
    },
    maxCachedAssets: 20,
    maxRetryCount: 3,
    syncInterval: 30000, // 30 seconds
    maxFileSize: 50 * 1024 * 1024 // 50MB
};

/* ========================================
   LocalStorageManager Class
   ======================================== */
class LocalStorageManager {
    constructor() {
        this.dbName = DB_CONFIG.name;
        this.dbVersion = DB_CONFIG.version;
        this.stores = DB_CONFIG.stores;
        this.db = null;
        this.syncInProgress = false;
        this.syncWorker = null;
        
        // Initialize database on construction
        this.initDB().catch(error => {
            console.error('Failed to initialize database:', error);
        });
    }
    
    /* ========================================
       Database Initialization
       ======================================== */
    
    /**
     * Initializes IndexedDB and creates necessary object stores
     * @returns {Promise<void>}
     */
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
                this.handleDatabaseUpgrade(event);
            };
        });
    }
    
    /**
     * Handles database schema upgrades
     * @param {IDBVersionChangeEvent} event - Upgrade event
     */
    handleDatabaseUpgrade(event) {
        const db = event.target.result;
        
        // Create sync queue store with specific indexes
        if (!db.objectStoreNames.contains(this.stores.syncQueue)) {
            const syncStore = db.createObjectStore(this.stores.syncQueue, { 
                keyPath: 'id' 
            });
            syncStore.createIndex('status', 'status', { unique: false });
            syncStore.createIndex('retryCount', 'retryCount', { unique: false });
        }
        
        // Create other stores with common indexes
        Object.values(this.stores).forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { 
                    keyPath: 'id' 
                });
                
                // Common indexes for all stores
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('syncStatus', 'syncStatus', { unique: false });
                
                // Store-specific indexes
                if (storeName === this.stores.cachedAssets) {
                    store.createIndex('assetId', 'assetId', { unique: true });
                }
                
                if (storeName === this.stores.recentModels) {
                    store.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            }
        });
    }

    /* ========================================
       Model Storage Operations
       ======================================== */
    
    /**
     * Saves a model to local storage with metadata
     * @param {Object} modelData - Model data to save
     * @returns {Promise<Object>} Saved model entry
     */
    async saveModelLocally(modelData) {
        if (!this.db) await this.initDB();
        
        const modelEntry = this.createModelEntry(modelData);
        
        // Save to local store
        await this.saveToStore(this.stores.savedModels, modelEntry);
        
        // Queue for sync if online sync is enabled
        await this.queueForSync(modelEntry);
        
        console.log('💾 Model saved locally with all formats, queued for sync');
        return modelEntry;
    }
    
    /**
     * Creates a standardized model entry object
     * @param {Object} modelData - Raw model data
     * @returns {Object} Formatted model entry
     */
    createModelEntry(modelData) {
        const modelBlobs = modelData.modelBlobs || {};
        const totalSize = this.calculateTotalSize(modelBlobs);
        
        return {
            id: modelData.taskId || `local_${Date.now()}`,
            taskId: modelData.taskId,
            name: modelData.name || `Model ${new Date().toLocaleDateString()}`,
            timestamp: Date.now(),
            syncStatus: 'pending',
            cloudUrl: null,
            localData: {
                modelBlobs: modelBlobs,
                thumbnail: modelData.thumbnail,
                metadata: {
                    formats: modelData.formats || ['glb', 'fbx', 'obj', 'usdz'],
                    totalSize: totalSize,
                    settings: modelData.settings,
                    polygons: modelData.polygons,
                    textured: modelData.textured
                }
            },
            formats: modelData.formats || ['glb', 'fbx', 'obj', 'usdz']
        };
    }
    
    /**
     * Calculates total size of model blobs
     * @param {Object} modelBlobs - Map of format to blob
     * @returns {number} Total size in bytes
     */
    calculateTotalSize(modelBlobs) {
        return Object.values(modelBlobs).reduce((sum, blob) => {
            return sum + (blob?.size || 0);
        }, 0);
    }

    /* ========================================
       Sync Queue Management
       ======================================== */
    
    /**
     * Adds a model to the sync queue
     * @param {Object} modelEntry - Model to queue for sync
     * @returns {Promise<Object>} Sync queue item
     */
    async queueForSync(modelEntry) {
        const syncItem = {
            id: `sync_${modelEntry.id}`,
            modelId: modelEntry.id,
            type: 'model',
            status: 'pending',
            retryCount: 0,
            data: modelEntry,
            createdAt: Date.now()
        };
        
        return await this.addToSyncQueue(syncItem);
    }
    
    /**
     * Adds an item to the sync queue
     * @param {Object} syncItem - Item to add to queue
     * @returns {Promise<Object>} Added sync item
     */
    async addToSyncQueue(syncItem) {
        return await this.saveToStore(this.stores.syncQueue, syncItem);
    }

    /**
     * Starts the background sync worker
     * Note: Currently disabled as models are saved to cloud on generation
     */
    startSyncWorker() {
        console.log('📱 Local storage active - cloud backup disabled (models already saved via /from-meshy)');
        return;
        
        /* Enable this when background sync is needed:
        if (this.syncWorker) return;
        
        this.syncWorker = setInterval(() => {
            if (navigator.onLine) {
                this.processSyncQueue();
            }
        }, DB_CONFIG.syncInterval);
        */
    }

    /**
     * Processes pending items in the sync queue
     * @returns {Promise<void>}
     */
    async processSyncQueue() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            const pendingItems = await this.getPendingSyncItems();
            
            if (pendingItems.length === 0) {
                return;
            }
            
            console.log(`☁️ Processing ${pendingItems.length} items in sync queue`);
            
            for (const item of pendingItems) {
                await this.processSyncItem(item);
            }
        } catch (error) {
            console.error('Sync queue processing error:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * Processes a single sync queue item
     * @param {Object} item - Sync queue item to process
     * @returns {Promise<void>}
     */
    async processSyncItem(item) {
        // Check retry limit
        if (item.retryCount > DB_CONFIG.maxRetryCount) {
            item.status = 'failed';
            await this.saveToStore(this.stores.syncQueue, item);
            return;
        }
        
        try {
            await this.syncItemToCloud(item);
            
            // Remove from sync queue on success
            await this.deleteFromStore(this.stores.syncQueue, item.id);
            
            // Update model sync status
            await this.updateModelSyncStatus(item.modelId, 'synced');
            
        } catch (error) {
            console.warn(`Sync failed for ${item.id}, will retry`);
            item.retryCount++;
            await this.saveToStore(this.stores.syncQueue, item);
        }
    }
    
    /**
     * Updates the sync status of a model
     * @param {string} modelId - Model ID to update
     * @param {string} status - New sync status
     * @returns {Promise<void>}
     */
    async updateModelSyncStatus(modelId, status) {
        const model = await this.getFromStore(this.stores.savedModels, modelId);
        if (model) {
            model.syncStatus = status;
            await this.saveToStore(this.stores.savedModels, model);
        }
    }

    /**
     * Gets all pending sync items from the queue
     * @returns {Promise<Array>} Array of pending sync items
     */
    async getPendingSyncItems() {
        const transaction = this.db.transaction([this.stores.syncQueue], 'readonly');
        const store = transaction.objectStore(this.stores.syncQueue);
        const index = store.index('status');
        const request = index.getAll('pending');
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Syncs a single item to the cloud
     * @param {Object} syncItem - Item to sync
     * @returns {Promise<Object>} Sync result
     */
    async syncItemToCloud(syncItem) {
        const apiUrl = this.getApiBaseUrl();
        const formData = this.prepareSyncFormData(syncItem);
        
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
    
    /**
     * Prepares FormData for cloud sync
     * @param {Object} syncItem - Sync item containing model data
     * @returns {FormData} Prepared form data
     */
    prepareSyncFormData(syncItem) {
        const formData = new FormData();
        
        // Add model blobs
        if (syncItem.data.localData.modelBlobs) {
            for (const [format, blob] of Object.entries(syncItem.data.localData.modelBlobs)) {
                if (blob && blob.size < DB_CONFIG.maxFileSize) {
                    formData.append(`model_${format}`, blob, `model.${format}`);
                }
            }
        }
        
        // Add thumbnail
        if (syncItem.data.localData.thumbnail) {
            formData.append('thumbnail', syncItem.data.localData.thumbnail, 'thumbnail.jpg');
        }
        
        // Add metadata
        formData.append('metadata', JSON.stringify({
            taskId: syncItem.data.taskId,
            name: syncItem.data.name,
            settings: syncItem.data.localData.metadata.settings,
            formats: syncItem.data.localData.metadata.formats,
            totalSize: syncItem.data.localData.metadata.totalSize
        }));
        
        return formData;
    }

    /* ========================================
       Model Retrieval Operations
       ======================================== */
    
    /**
     * Gets a locally stored model by ID
     * @param {string} modelId - Model ID to retrieve
     * @returns {Promise<Object|null>} Model data or null
     */
    async getLocalModel(modelId) {
        if (!this.db) await this.initDB();
        return await this.getFromStore(this.stores.savedModels, modelId);
    }

    /**
     * Gets all locally stored models
     * @returns {Promise<Array>} Array of all local models
     */
    async getAllLocalModels() {
        if (!this.db) await this.initDB();
        return await this.getAllFromStore(this.stores.savedModels);
    }

    /**
     * Deletes a locally stored model
     * @param {string} modelId - Model ID to delete
     * @returns {Promise<void>}
     */
    async deleteLocalModel(modelId) {
        if (!this.db) await this.initDB();
        await this.deleteFromStore(this.stores.savedModels, modelId);
        console.log('✅ Model deleted locally:', modelId);
    }

    /* ========================================
       Asset Caching Operations
       ======================================== */
    
    /**
     * Caches an asset with automatic cleanup of old entries
     * @param {Object} assetData - Asset data to cache
     * @returns {Promise<Object>} Cached asset data
     */
    async cacheAsset(assetData) {
        const store = this.stores.cachedAssets;
        assetData.id = `asset_${assetData.assetId}`;
        
        // Implement cache size limit
        await this.enforeCacheLimit(store);
        
        return await this.saveToStore(store, assetData);
    }
    
    /**
     * Enforces cache size limit by removing old entries
     * @param {string} storeName - Store to enforce limit on
     * @returns {Promise<void>}
     */
    async enforeCacheLimit(storeName) {
        const cached = await this.getAllFromStore(storeName);
        
        if (cached.length >= DB_CONFIG.maxCachedAssets) {
            // Sort by timestamp (oldest first)
            const sortedByTime = cached.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = sortedByTime.slice(0, cached.length - DB_CONFIG.maxCachedAssets + 1);
            
            for (const item of toDelete) {
                await this.deleteFromStore(storeName, item.id);
                console.log('🧹 Removed old cached asset:', item.id);
            }
        }
    }

    /**
     * Gets a cached asset by ID
     * @param {string} assetId - Asset ID to retrieve
     * @returns {Promise<Object|null>} Cached asset or null
     */
    async getCachedAsset(assetId) {
        const store = this.stores.cachedAssets;
        return await this.getFromStore(store, `asset_${assetId}`);
    }

    /**
     * Deletes a cached asset
     * @param {string} assetId - Asset ID to delete
     * @returns {Promise<void>}
     */
    async deleteCachedAsset(assetId) {
        const store = this.stores.cachedAssets;
        return await this.deleteFromStore(store, `asset_${assetId}`);
    }

    /* ========================================
       Generic Store Operations
       ======================================== */
    
    /**
     * Saves data to a specific object store
     * @param {string} storeName - Name of the store
     * @param {Object} data - Data to save
     * @returns {Promise<Object>} Saved data
     */
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

    /**
     * Retrieves data from a specific object store
     * @param {string} storeName - Name of the store
     * @param {string} id - ID of the item to retrieve
     * @returns {Promise<Object|null>} Retrieved data or null
     */
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

    /**
     * Gets all items from a specific object store
     * @param {string} storeName - Name of the store
     * @returns {Promise<Array>} Array of all items in store
     */
    async getAllFromStore(storeName) {
        if (!this.db) await this.initDB();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const items = request.result;
                // Sort by timestamp (newest first)
                items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Deletes an item from a specific object store
     * @param {string} storeName - Name of the store
     * @param {string} id - ID of the item to delete
     * @returns {Promise<void>}
     */
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

    /* ========================================
       Utility Methods
       ======================================== */
    
    /**
     * Gets current sync status information
     * @returns {Promise<Object>} Sync status object
     */
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

    /**
     * Determines the appropriate API base URL
     * @returns {string} API base URL
     */
    getApiBaseUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDev) {
            return `http://${hostname}:3000/api`;
        } else {
            return protocol === 'https:' 
                ? `https://${hostname}/api` 
                : `http://${hostname}:3000/api`;
        }
    }

    /**
     * Stops the background sync worker
     */
    stopSyncWorker() {
        if (this.syncWorker) {
            clearInterval(this.syncWorker);
            this.syncWorker = null;
            console.log('🛑 Sync worker stopped');
        }
    }
}

/* ========================================
   LocalModelViewer Class
   ======================================== */
class LocalModelViewer {
    constructor() {
        this.formatIcons = {
            glb: '📦',
            fbx: '🎮',
            obj: '🔷',
            usdz: '🍎'
        };
    }
    
    /**
     * Opens a locally stored model for viewing
     * @param {string} modelId - Model ID to open
     * @returns {Promise<void>}
     */
    async openLocalModel(modelId) {
        try {
            const model = await window.LocalStorageManager.getLocalModel(modelId);
            
            if (!model) {
                console.error('Model not found:', modelId);
                this.showErrorMessage('Model not found');
                return;
            }
            
            // Try to open in MobileAssetViewer if available
            if (window.MobileAssetViewer) {
                window.MobileAssetViewer.openLocalModel(modelId);
            } else {
                // Fallback to format selection modal
                this.showFormatOptions(model);
            }
            
        } catch (error) {
            console.error('Error opening local model:', error);
            this.showErrorMessage('Failed to open model');
        }
    }
    
    /**
     * Shows format selection modal for model download
     * @param {Object} model - Model data
     */
    showFormatOptions(model) {
        const formats = model.localData.modelBlobs;
        console.log('Available formats:', Object.keys(formats));
        
        // Remove existing modal if present
        this.closeModal();
        
        // Create and display new modal
        const modal = this.createFormatModal(model, formats);
        document.body.appendChild(modal);
    }
    
    /**
     * Creates the format selection modal element
     * @param {Object} model - Model data
     * @param {Object} formats - Available format blobs
     * @returns {HTMLElement} Modal element
     */
    createFormatModal(model, formats) {
        const modal = document.createElement('div');
        modal.className = 'download-format-modal active';
        modal.style.display = 'flex';
        
        const formatButtons = this.generateFormatButtons(model, formats);
        
        modal.innerHTML = `
            <div class="download-modal-overlay" onclick="window.LocalModelViewer.closeModal()"></div>
            <div class="download-modal-content">
                <div class="download-modal-header">
                    <h3>Download Model</h3>
                    <button class="close-btn" onclick="window.LocalModelViewer.closeModal()">×</button>
                </div>
                <div class="download-formats-grid">
                    ${formatButtons}
                </div>
            </div>
        `;
        
        return modal;
    }
    
    /**
     * Generates HTML for format selection buttons
     * @param {Object} model - Model data
     * @param {Object} formats - Available format blobs
     * @returns {string} HTML string of buttons
     */
    generateFormatButtons(model, formats) {
        return Object.entries(formats)
            .filter(([format, blob]) => blob)
            .map(([format, blob]) => `
                <button class="format-option-btn" 
                        onclick="window.LocalModelViewer.downloadFormat('${model.id}', '${format}', '${model.name}')">
                    <div class="format-icon">${this.getFormatIcon(format)}</div>
                    <div class="format-name">${format.toUpperCase()}</div>
                    <div class="format-desc">${this.formatFileSize(blob.size)}</div>
                </button>
            `)
            .join('');
    }
    
    /**
     * Downloads a specific format of a model
     * @param {string} modelId - Model ID
     * @param {string} format - Format to download
     * @param {string} modelName - Name for the downloaded file
     * @returns {Promise<void>}
     */
    async downloadFormat(modelId, format, modelName) {
        try {
            const model = await window.LocalStorageManager.getLocalModel(modelId);
            const blob = model.localData.modelBlobs[format];
            
            if (!blob) {
                throw new Error(`Format ${format} not available`);
            }
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${modelName}.${format}`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            URL.revokeObjectURL(url);
            this.closeModal();
            
            console.log(`✅ Downloaded ${format} format for ${modelName}`);
            
        } catch (error) {
            console.error('Download error:', error);
            this.showErrorMessage(`Failed to download ${format} format`);
        }
    }
    
    /**
     * Gets the icon for a specific format
     * @param {string} format - File format
     * @returns {string} Icon emoji
     */
    getFormatIcon(format) {
        return this.formatIcons[format] || '📄';
    }
    
    /**
     * Formats file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    
    /**
     * Closes the format selection modal
     */
    closeModal() {
        const modal = document.querySelector('.download-format-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    /**
     * Shows an error message to the user
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        // Implement toast notification or alert
        console.error(message);
        alert(message);
    }
}

/* ========================================
   Initialization and Event Listeners
   ======================================== */

// Initialize singleton instances
window.LocalStorageManager = new LocalStorageManager();
window.LocalModelViewer = new LocalModelViewer();

/**
 * Network status event listeners
 * Handles online/offline transitions
 */
window.addEventListener('online', () => {
    console.log('📶 Back online - processing sync queue');
    window.LocalStorageManager.processSyncQueue();
});

window.addEventListener('offline', () => {
    console.log('📵 Offline - sync paused');
});

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    window.LocalStorageManager.stopSyncWorker();
});

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocalStorageManager, LocalModelViewer };
}