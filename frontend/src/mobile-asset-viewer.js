// mobile-asset-viewer.js - Mobile App Asset Viewer Controller
class MobileAssetViewer {
    // COMPLETE REPLACEMENT of constructor
constructor() {
    this.currentAsset = null;
    this.currentAssetId = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.isLiked = false;
    this.availableFormats = [];
    this.viewerInitialized = false;
    
    console.log('📱 Mobile Asset Viewer initialized');
    
    // Debug: Check Three.js availability
    console.log('=== Three.js Dependencies Check ===');
    console.log('THREE available:', typeof THREE !== 'undefined');
    console.log('OrbitControls available:', typeof THREE?.OrbitControls !== 'undefined' || typeof window.OrbitControls !== 'undefined');
    console.log('GLTFLoader available:', typeof THREE?.GLTFLoader !== 'undefined' || typeof window.GLTFLoader !== 'undefined');
    console.log('===================================');
}
isPlatform(platform) {
    const isMobileApp = window.Capacitor && 
                       window.Capacitor.isNativePlatform && 
                       window.Capacitor.isNativePlatform();
    
    switch(platform) {
        case 'mobile-app': return isMobileApp;
        case 'web': return !isMobileApp;
        default: return false;
    }
}

 initializeViewerHTML() {
    if (this.viewerInitialized) {
        console.log('✅ Viewer already initialized');
        return;
    }
    
    console.log('🔧 Creating Mobile Asset Viewer HTML...');
    
    // Check if overlay already exists
    if (document.getElementById('mobileAssetViewer')) {
        console.log('✅ Overlay already exists');
        this.viewerInitialized = true;
        return;
    }
    
    // Create the viewer overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-asset-viewer-overlay';
    overlay.id = 'mobileAssetViewer';
    overlay.style.display = 'none'; // Start hidden
    
    overlay.innerHTML = `
        <div class="asset-viewer-container">
            <!-- Header -->
            <div class="asset-viewer-header">
                <button class="back-btn" id="assetViewerBackBtn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>
                <h2 class="asset-viewer-title" id="assetViewerTitle">Loading...</h2>
                <div class="asset-viewer-actions">
                    <button class="like-btn" id="assetLikeBtn">
                        <svg class="heart-icon" viewBox="0 0 24 24">
                            <path class="heart-outline" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path class="heart-filled" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" opacity="0"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- 3D Viewer Section -->
            <div class="asset-viewer-3d" id="assetViewer3d">
                <div class="viewer-loading-state" id="viewerLoadingState">
                    <div class="loading-spinner"></div>
                    <p class="loading-text">Loading 3D model...</p>
                </div>
                <div class="viewer-error-state" id="viewerErrorState" style="display: none;">
                    <div class="error-icon">⚠️</div>
                    <p class="error-text">Unable to load 3D model</p>
                    <p class="error-subtext">The model may be unavailable</p>
                </div>
                <!-- Canvas will be inserted here -->
            </div>

            <!-- Asset Info Overlay (Top Left) -->
          <!-- Asset Info Overlay (Top Left) -->
<div class="asset-info-overlay" id="assetInfoOverlay">
                <div class="asset-info-content">
                    <h3 class="asset-title" id="assetTitle">Loading...</h3>
                    <div class="asset-details">
                        <p><strong>Views:</strong> <span id="assetViews">0</span></p>
                        <p><strong>Downloads:</strong> <span id="assetDownloads">0</span></p>
                        <p><strong>Polygons:</strong> <span id="assetPolygons">0</span></p>
                    </div>
                    <div class="asset-tags-display" id="assetTagsDisplay">
                        <!-- Tags will be populated here -->
                    </div>
                </div>
            </div>

            <!-- Bottom Actions -->
            <div class="asset-viewer-actions-bottom">
                <div class="action-buttons-grid">
                    <button class="action-btn download-btn" id="downloadBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        <span>Download</span>
                    </button>
                    
                    <button class="action-btn share-btn" id="shareBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"/>
                            <circle cx="6" cy="12" r="3"/>
                            <circle cx="18" cy="19" r="3"/>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        <span>Share</span>
                    </button>
                    
                    <button class="action-btn info-btn" id="infoBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span>Info</span>
                    </button>
                    
                   <button class="action-btn disabled-btn" id="rigBtn" disabled>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m4.22-10.22l4.24 4.24m-4.24 4.24l4.24 4.24M20 12h6m-6 0h-6"/>
    </svg>
    <span>Rig (Soon)</span>
</button>
                </div>
            </div>
        </div>
    `;
    
    // Append to body
    document.body.appendChild(overlay);
    
    // Create download format modal separately
    const modalDiv = document.createElement('div');
    modalDiv.className = 'download-format-modal';
    modalDiv.id = 'downloadFormatModal';
    modalDiv.style.display = 'none';
    modalDiv.innerHTML = `
        <div class="download-modal-overlay" id="downloadModalOverlay"></div>
        <div class="download-modal-content">
            <div class="download-modal-header">
                <h3>Select Format</h3>
                <button class="close-btn" id="closeDownloadModal">&times;</button>
            </div>
            <div class="download-formats-grid">
                <button class="format-option-btn" data-format="glb">
                    <div class="format-icon">📦</div>
                    <div class="format-name">GLB</div>
                    <div class="format-desc">Universal 3D format</div>
                </button>
                <button class="format-option-btn" data-format="fbx">
                    <div class="format-icon">🎮</div>
                    <div class="format-name">FBX</div>
                    <div class="format-desc">Game engines</div>
                </button>
                <button class="format-option-btn" data-format="obj">
                    <div class="format-icon">🎨</div>
                    <div class="format-name">OBJ</div>
                    <div class="format-desc">3D software</div>
                </button>
                <button class="format-option-btn" data-format="usdz">
                    <div class="format-icon">🍎</div>
                    <div class="format-name">USDZ</div>
                    <div class="format-desc">Apple AR</div>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    
    this.viewerInitialized = true;
    
    // Verify it was added
    const checkOverlay = document.getElementById('mobileAssetViewer');
    if (checkOverlay) {
        console.log('✅ Mobile Asset Viewer HTML successfully created');
    } else {
        console.error('❌ Failed to add overlay to DOM');
    }
    
    // Setup network listener
    this.setupNetworkListener();
}

    // Get API base URL
   getApiBaseUrl() {
    // Check multiple sources for API URL
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) {
        return window.APP_CONFIG.API_BASE_URL;
    }
    
    // Capacitor/Android emulator
    if (window.Capacitor) {
        return 'http://10.0.2.2:3000/api';
    }
    
    // Local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // Production
    const protocol = window.location.protocol;
    return protocol === 'https:' 
        ? `https://${window.location.hostname}/api`
        : `http://${window.location.hostname}:3000/api`;
}
   showViewer() {

    const overlay = document.getElementById('mobileAssetViewer');
    if (overlay) {
        // Make sure it's visible
        overlay.classList.add('active');
        overlay.style.display = 'flex';  
        overlay.style.opacity = '1';     
        overlay.style.transform = 'translateY(0)';
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Viewer shown');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize 3D scene after a small delay
        setTimeout(() => {
            this.init3DScene();
            this.loadAssetData();
        }, 100);
    } else {
        console.error('❌ Mobile Asset Viewer overlay not found!');
        
        // Only try to initialize once to prevent infinite loop
        if (!this.viewerInitialized) {
            this.initializeViewerHTML();
            // Try showing again after initialization
            setTimeout(() => {
                const retryOverlay = document.getElementById('mobileAssetViewer');
                if (retryOverlay) {
                    this.showViewer();
                } else {
                    console.error('❌ Failed to create viewer overlay');
                }
            }, 100);
        }
    }
}

showError(message = 'Failed to load model') {
    const viewer3d = document.getElementById('assetViewer3d');
    if (viewer3d) {
        viewer3d.innerHTML = `
            <div class="viewer-error-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem;">
                <div class="error-icon" style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <p class="error-text" style="color: white; font-size: 1.2rem; margin-bottom: 0.5rem;">${message}</p>
                <p class="error-subtext" style="color: rgba(255,255,255,0.6);">The model may be unavailable</p>
                <button onclick="window.MobileAssetViewer.closeViewer()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 8px; cursor: pointer;">
                    Go Back
                </button>
            </div>
        `;
    }
}

showLoadingState() {
    const loading = document.getElementById('viewerLoadingState');
    const error = document.getElementById('viewerErrorState');
    
    if (loading) loading.style.display = 'flex';
    if (error) error.style.display = 'none';
}

hideLoadingState() {
    const loading = document.getElementById('viewerLoadingState');
    if (loading) loading.style.display = 'none';
}

showErrorState() {
    const loading = document.getElementById('viewerLoadingState');
    const error = document.getElementById('viewerErrorState');
    
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'flex';
}

 async openAsset(assetId) {
    console.log('📱 Opening asset:', assetId);
    
    // Check if viewer HTML exists, if not initialize it
    if (!this.viewerInitialized) {
        console.log('🔧 Initializing viewer HTML first...');
        this.initializeViewerHTML();
        
        // Wait a moment for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
        // Store the asset ID first
        this.currentAssetId = assetId;
        
        // Show the viewer immediately with loading state
        this.showViewer();
        
        // FIX: Use proper API URL
        const apiUrl = window.APP_CONFIG?.API_BASE_URL || 
                      (window.Capacitor ? 'http://10.0.2.2:3000/api' : 
                       window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
        
        console.log('🔗 API URL:', `${apiUrl}/assets/${assetId}`);
        
        // FIX: Add auth token to request
        const authToken = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            console.log('🔑 Including auth token in request');
        }
        
        const response = await fetch(`${apiUrl}/assets/${assetId}`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        this.currentAsset = data.asset || data;
        
        console.log('✅ Asset data loaded:', this.currentAsset);
        
        // Update UI with asset info
        this.updateAssetInfo();
        
        // Load the 3D model
        await this.load3DModel();
        
    } catch (error) {
        console.error('❌ Error opening asset:', error);
        this.showError(`Failed to load asset: ${error.message}`);
    }
}

showOfflineNotification() {
    // Show a subtle notification that some features are limited
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
        <div style="
            position: absolute;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 152, 0, 0.9);
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: 30px;
            font-family: 'Sora', sans-serif;
            font-size: 0.85rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideDown 0.3s ease;
        ">
            <span>📵</span>
            <span>Offline Mode - Only cached GLB format available</span>
        </div>
    `;
    
    const viewer = document.querySelector('.mobile-asset-viewer-overlay');
    if (viewer) {
        viewer.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

showOfflineError() {
    const errorContent = `
        <div class="viewer-error-state" style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            text-align: center;
        ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📵</div>
            <h3 style="color: white; font-family: 'Sora', sans-serif; font-size: 1.5rem; margin-bottom: 0.5rem;">
                You're Offline
            </h3>
            <p style="color: rgba(255,255,255,0.7); margin-bottom: 1.5rem; max-width: 300px; line-height: 1.5;">
                This model isn't cached yet. Connect to the internet to view new models or browse your saved models instead.
            </p>
            <div style="display: flex; gap: 1rem; flex-direction: column; width: 100%; max-width: 250px;">
                <button onclick="window.MobileAssetViewer.closeViewer()" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    font-family: 'Sora', sans-serif;
                    font-weight: 500;
                    cursor: pointer;
                ">
                    Go Back
                </button>
                <button onclick="window.AppNavigation.navigateToSection('account'); window.MobileAssetViewer.closeViewer();" style="
                    background: #00bcd4;
                    border: none;
                    color: white;
                    padding: 0.8rem 1.5rem;
                    border-radius: 8px;
                    font-family: 'Sora', sans-serif;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    View Saved Models
                </button>
            </div>
        </div>
    `;
    
    const viewer3d = document.getElementById('assetViewer3d');
    if (viewer3d) {
        viewer3d.innerHTML = errorContent;
    }
}

// Update the download button handler to check online status
setupDownloadButton() {
    const downloadBtn = document.getElementById('assetDownloadBtn');
    if (!downloadBtn) return;
    
    downloadBtn.onclick = async () => {
        // Check if this is a cached asset
        const cached = await this.loadCachedAsset(this.currentAssetId);
        
        if (cached && !navigator.onLine) {
            // Offline with cached asset - only GLB available
            this.showOfflineDownloadModal(cached);
        } else if (!navigator.onLine) {
            // Offline without cache
            this.showOfflineDownloadError();
        } else {
            // Online - show all formats
            this.showDownloadModal();
        }
    };
}

showOfflineDownloadModal(cachedAsset) {
    const modal = document.createElement('div');
    modal.className = 'download-format-modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="download-modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="download-modal-content">
            <div class="download-modal-header">
                <h3>Download Model (Offline)</h3>
                <button class="close-btn" onclick="this.closest('.download-format-modal').remove()">×</button>
            </div>
            
            <div style="
                background: rgba(255, 152, 0, 0.1);
                border: 1px solid rgba(255, 152, 0, 0.3);
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.8rem;
            ">
                <span style="font-size: 1.5rem;">📵</span>
                <div style="flex: 1;">
                    <p style="color: #ff9800; font-weight: 600; margin-bottom: 0.2rem; font-size: 0.9rem;">
                        Limited Offline Access
                    </p>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.8rem; margin: 0;">
                        Only cached GLB format is available offline. Connect to internet for all formats.
                    </p>
                </div>
            </div>
            
            <div class="download-formats-grid" style="grid-template-columns: 1fr;">
                <button class="format-option-btn" onclick="window.MobileAssetViewer.downloadCachedGLB()">
                    <div class="format-icon">📦</div>
                    <div class="format-name">GLB</div>
                    <div class="format-desc">Cached Version</div>
                </button>
                
                <!-- Show other formats as disabled -->
                <div style="opacity: 0.3; pointer-events: none;">
                    <button class="format-option-btn" disabled>
                        <div class="format-icon">🎮</div>
                        <div class="format-name">FBX</div>
                        <div class="format-desc">Requires Internet</div>
                    </button>
                </div>
                
                <div style="opacity: 0.3; pointer-events: none;">
                    <button class="format-option-btn" disabled>
                        <div class="format-icon">🔷</div>
                        <div class="format-name">OBJ</div>
                        <div class="format-desc">Requires Internet</div>
                    </button>
                </div>
                
                <div style="opacity: 0.3; pointer-events: none;">
                    <button class="format-option-btn" disabled>
                        <div class="format-icon">🍎</div>
                        <div class="format-name">USDZ</div>
                        <div class="format-desc">Requires Internet</div>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

showOfflineDownloadError() {
    this.showFeedback('❌ Download unavailable offline. Please connect to internet.', 'error');
}

async downloadCachedGLB() {
    try {
        const cached = await this.loadCachedAsset(this.currentAssetId);
        if (!cached || !cached.modelBlob) {
            this.showFeedback('Cached model not found', 'error');
            return;
        }
        
        // Create download link
        const url = URL.createObjectURL(cached.modelBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cached.metadata?.name || 'model'}.glb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Close modal
        document.querySelector('.download-format-modal')?.remove();
        
        this.showFeedback('Downloading cached GLB', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        this.showFeedback('Download failed', 'error');
    }
}

// Add network status listener
setupNetworkListener() {
    window.addEventListener('online', () => {
        // Remove any offline notifications
        document.querySelectorAll('.offline-notification').forEach(el => el.remove());
        
        // Show online notification
        this.showFeedback('✅ Back online! All features available.', 'success');
    });
    
    window.addEventListener('offline', () => {
        this.showFeedback('📵 You\'re offline. Some features limited.', 'warning');
    });
}

  // Setup event listeners
setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('assetViewerBackBtn');
    if (backBtn) {
        backBtn.onclick = () => this.closeViewer();
    }
    
    // Like button
    const likeBtn = document.getElementById('assetLikeBtn');
    if (likeBtn) {
        likeBtn.onclick = () => this.toggleLike();
    }
    
    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.onclick = () => this.handleDownload();
    }
    
    // Share button
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = () => this.handleShare();
    }
    
    // Info button
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.onclick = () => this.toggleInfo();
    }
    
    // Download modal
    const closeModal = document.getElementById('closeDownloadModal');
    if (closeModal) {
        closeModal.onclick = () => this.closeDownloadModal();
    }
    
    const modalOverlay = document.getElementById('downloadModalOverlay');
    if (modalOverlay) {
        modalOverlay.onclick = () => this.closeDownloadModal();
    }
    
    // Format buttons
    document.querySelectorAll('.format-option-btn').forEach(btn => {
        btn.onclick = (e) => {
            const format = e.currentTarget.dataset.format;
            this.downloadAsset(format);
        };
    });
    
    // ADD THIS NEW CODE HERE - Rig button handler
    const rigBtn = document.getElementById('rigBtn');
    if (rigBtn) {
        // Make it clickable even though it's disabled
        rigBtn.style.pointerEvents = 'auto';
        
        rigBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Show coming soon message
            this.showFeedback('Rig feature coming soon! We\'re working on it.', 'info', 3000);
            return false;
        };
    }
}
async loadCachedAsset(assetId) {
    try {
        if (!window.LocalStorageManager) return null;
        
        // This method needs to be added to LocalStorageManager
        const cached = await window.LocalStorageManager.getCachedAsset(assetId);
        if (cached && cached.modelBlob) {
            const age = Date.now() - cached.timestamp;
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            
            if (age < sevenDays) {
                return cached;
            } else {
                await window.LocalStorageManager.deleteCachedAsset(assetId);
            }
        }
        return null;
    } catch (error) {
        console.warn('Cache check failed:', error);
        return null;
    }
}

async displayAssetFromCache(cachedAsset) {
    const blobUrl = URL.createObjectURL(cachedAsset.modelBlob);
    const viewer3d = document.getElementById('assetViewer3d');
    if (viewer3d) {
        await this.load3DModel(blobUrl, true);
    }
    if (cachedAsset.metadata) {
        this.updateAssetInfo(cachedAsset.metadata);
    }
}

async cacheAssetInBackground(assetData) {
    try {
        if (!window.LocalStorageManager) return;
        
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection && connection.saveData) {
            console.log('📵 Data saver mode - skipping cache');
            return;
        }
        
        const modelUrl = assetData.modelUrl || `${this.apiBaseUrl}/proxyModel/${assetData._id}?format=glb`;
        const response = await fetch(modelUrl);
        if (!response.ok) return;
        
        const blob = await response.blob();
        
        if (blob.size > 20 * 1024 * 1024) {
            console.log('📦 Model too large to cache:', (blob.size / 1024 / 1024).toFixed(2), 'MB');
            return;
        }
        
        await window.LocalStorageManager.cacheAsset({
            assetId: assetData._id,
            modelBlob: blob,
            metadata: {
                name: assetData.name,
                views: assetData.views,
                downloads: assetData.downloads,
                thumbnail: assetData.thumbnailUrl
            },
            timestamp: Date.now()
        });
        
        console.log('💾 Asset cached for faster viewing next time');
        
    } catch (error) {
        console.warn('Background caching failed:', error);
    }
}
    async loadAssetData() {
    try {
        console.log('📥 Loading asset data:', this.currentAssetId);
        
        // Show loading state
        this.showLoadingState();
        
        // FIX: Use proper API URL
        const apiUrl = window.APP_CONFIG?.API_BASE_URL || 
                      (window.Capacitor ? 'http://10.0.2.2:3000/api' : 
                       window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');
        
        // FIX: Add auth token
        const authToken = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            console.log('🔑 Including auth token in loadAssetData');
        }
        
        const response = await fetch(`${apiUrl}/assets/${this.currentAssetId}`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load asset: ${response.status}`);
        }
        
        const data = await response.json();
        this.currentAsset = data.asset;
        
        console.log('✅ Asset loaded:', this.currentAsset.name);
        
        // Detect available formats
        this.detectFormats();
        
        // Update UI
        this.updateAssetInfo();
        
    } catch (error) {
        console.error('❌ Error loading asset:', error);
        this.showErrorState();
    }
}

    // Detect available formats
    detectFormats() {
        this.availableFormats = [];
        
        if (this.currentAsset.availableFormats && Array.isArray(this.currentAsset.availableFormats)) {
            this.availableFormats = [...this.currentAsset.availableFormats];
        } else if (this.currentAsset.modelFiles) {
            this.availableFormats = Object.keys(this.currentAsset.modelFiles).filter(format => {
                const file = this.currentAsset.modelFiles[format];
                return file && file.url;
            });
        } else if (this.currentAsset.modelFile) {
            this.availableFormats = ['glb'];
        }
        
        // Default to GLB if nothing found
        if (this.availableFormats.length === 0) {
            this.availableFormats = ['glb'];
        }
        
        console.log('📋 Available formats:', this.availableFormats);
        
        // Update format buttons
        this.updateFormatButtons();
    }

    // Update format buttons
    updateFormatButtons() {
        document.querySelectorAll('.format-option-btn').forEach(btn => {
            const format = btn.dataset.format;
            if (this.availableFormats.includes(format)) {
                btn.style.display = 'flex';
                btn.disabled = false;
            } else {
                btn.style.display = 'none';
                btn.disabled = true;
            }
        });
    }

    // Update asset info
    updateAssetInfo() {
        // Title
        const title = document.getElementById('assetViewerTitle');
        if (title) title.textContent = this.currentAsset.name || 'Unknown Asset';
        
        const assetTitle = document.getElementById('assetTitle');
        if (assetTitle) assetTitle.textContent = this.currentAsset.name || 'Unknown Asset';
        
        // Stats
        const views = document.getElementById('assetViews');
        if (views) views.textContent = (this.currentAsset.views || 0).toLocaleString();
        
        const downloads = document.getElementById('assetDownloads');
        if (downloads) downloads.textContent = (this.currentAsset.downloads || 0).toLocaleString();
        
        const polygons = document.getElementById('assetPolygons');
        if (polygons) {
            const polycount = this.currentAsset.polygons || this.currentAsset.polycount || 0;
            polygons.textContent = polycount.toLocaleString();
        }
        
        // Tags
        const tagsContainer = document.getElementById('assetTagsDisplay');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            
            if (this.currentAsset.tags && Array.isArray(this.currentAsset.tags)) {
                this.currentAsset.tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'asset-tag';
                    tagEl.textContent = tag;
                    tagsContainer.appendChild(tagEl);
                });
            }
            
            // Add formats as a tag
            if (this.availableFormats.length > 0) {
                const formatTag = document.createElement('span');
                formatTag.className = 'asset-tag formats-tag';
                formatTag.textContent = `Formats: ${this.availableFormats.join(', ').toUpperCase()}`;
                tagsContainer.appendChild(formatTag);
            }
        }
    }

    // Initialize 3D scene - MINIMAL changes for dark model visibility
init3DScene() {
    console.log('🎬 Initializing 3D scene...');
    
    if (!THREE) {
        console.error('❌ Three.js not loaded');
        this.showErrorState();
        return;
    }
    
    const container = document.getElementById('assetViewer3d');
    if (!container) return;
    
    // Clear any existing canvas
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) existingCanvas.remove();
    
    // Setup scene
    this.scene = new THREE.Scene();
    
    // SUBTLE gradient background - very dark
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, '#0f0f0f');    // Very dark gray at top (was #1a1a1a)
    gradient.addColorStop(0.5, '#0a0a0a');  // Nearly black in middle
    gradient.addColorStop(1, '#000000');    // Pure black at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);
    this.scene.background = new THREE.CanvasTexture(canvas);
    
    // Setup camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 1, 5);
    
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    
    // MINIMAL LIGHTING - Keep colors crisp
    
    // Subtle ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // SINGLE rim light for edge definition on dark models
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4); // Subtle rim light
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);
    
    // Setup controls - FIXED FOR CDN VERSION
    const OrbitControlsClass = THREE.OrbitControls || window.OrbitControls;
    if (OrbitControlsClass) {
        this.controls = new OrbitControlsClass(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        console.log('✅ OrbitControls initialized');
    } else {
        console.warn('⚠️ OrbitControls not available');
    }
    
    // Start animation
    this.animate();
    
    console.log('✅ 3D scene initialized');
}

    // Animation loop
    animate() {
        if (!this.renderer) return;
        
        requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

   async load3DModel() {
    console.log('🎨 Loading 3D model...');
    
    // Check for GLTFLoader - FIXED FOR CDN VERSION
    const GLTFLoaderClass = THREE.GLTFLoader || window.GLTFLoader;
    
    if (!this.scene || !GLTFLoaderClass) {
        console.error('❌ Scene or GLTFLoader not available');
        this.hideLoadingState();
        return;
    }
    
    // Determine model URL
    let modelUrl = null;
    
    if (this.currentAsset.modelFiles && this.currentAsset.modelFiles.glb) {
        modelUrl = this.currentAsset.modelFiles.glb.url;
    } else if (this.currentAsset.modelFile) {
        modelUrl = this.currentAsset.modelFile.url;
    } else if (this.currentAsset.meshyTaskId) {
        modelUrl = `${this.getApiBaseUrl()}/proxyModel/${this.currentAsset.meshyTaskId}?format=glb`;
    }
    
    if (!modelUrl) {
        console.warn('⚠️ No model URL available');
        this.hideLoadingState();
        return;
    }
    
    const loader = new GLTFLoaderClass();
    
    loader.load(
        modelUrl,
        (gltf) => {
            console.log('✅ Model loaded');
            
            // Remove old model
            if (this.model) {
                this.scene.remove(this.model);
            }
            
            this.model = gltf.scene;
            
            // Enhanced material processing to fix waves/ridges
            this.model.traverse((child) => {
                if (child.isMesh) {
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Fix geometry normals first
                    if (child.geometry) {
                        // Ensure proper normals for smooth shading
                        child.geometry.computeVertexNormals();
                        
                        // Ensure geometry has proper attributes
                        if (child.geometry.attributes.normal) {
                            child.geometry.normalizeNormals();
                        }
                    }
                    
                    // Enhanced material settings
                    if (child.material) {
                        // Ensure smooth shading (not flat)
                        child.material.flatShading = false;
                        
                        // Improve material quality
                        child.material.side = THREE.FrontSide; // Prevent double-sided rendering issues
                        child.material.vertexColors = false; // Disable if causing issues
                        
                        // Get max anisotropy for better texture quality
                        const maxAnisotropy = this.renderer ? 
                            this.renderer.capabilities.getMaxAnisotropy() : 16;
                        
                        // Process all texture maps with better filtering
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach(mapName => {
                            if (child.material[mapName]) {
                                // Apply anisotropic filtering
                                child.material[mapName].anisotropy = maxAnisotropy;
                                
                                // Use better texture filtering
                                child.material[mapName].minFilter = THREE.LinearMipmapLinearFilter;
                                child.material[mapName].magFilter = THREE.LinearFilter;
                                
                                // Ensure proper texture wrapping
                                child.material[mapName].wrapS = THREE.RepeatWrapping;
                                child.material[mapName].wrapT = THREE.RepeatWrapping;
                                
                                // Update texture
                                child.material[mapName].needsUpdate = true;
                            }
                        });
                        
                        // Adjust normal map intensity if it exists (reduces ridge effect)
                        if (child.material.normalMap && child.material.normalScale) {
                            // Reduce normal intensity if too strong
                            child.material.normalScale.set(0.5, 0.5);
                        }
                        
                        // Set reasonable material properties for vibrant but smooth appearance
                        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                            // Maintain vibrant colors
                            child.material.metalness = Math.min(child.material.metalness || 0, 0.5);
                            child.material.roughness = Math.max(child.material.roughness || 0.5, 0.3);
                            
                            // Enable environment mapping for better reflections
                            child.material.envMapIntensity = 1.0;
                        }
                        
                        // Force material update
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Center and scale model
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;
            this.model.scale.setScalar(scale);
            
            this.model.position.x = -center.x * scale;
            this.model.position.y = -center.y * scale;
            this.model.position.z = -center.z * scale;
            
            // Rotate model 45 degrees to the RIGHT (positive rotation) - FLIPPED
            this.model.rotation.y = Math.PI / 4; // +45 degrees in radians
            
            // Add to scene
            this.scene.add(this.model);
            const infoOverlay = document.getElementById('assetInfoOverlay');
if (infoOverlay) {
    setTimeout(() => {
        infoOverlay.classList.add('loaded');
    }, 100);
}
            // Hide loading state
            this.hideLoadingState();
            
            // Adjust camera
            this.frameModel();
        },
        (progress) => {
            const percent = (progress.loaded / progress.total * 100).toFixed(0);
            console.log(`Loading: ${percent}%`);
        },
        (error) => {
            console.error('❌ Error loading model:', error);
            this.showErrorState();
        }
    );
}

// Frame model in view - Model positioned lower to avoid info section overlap
frameModel() {
    if (!this.model || !this.camera || !this.controls) return;
    
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    
    // Calculate optimal camera distance (from generate-controller)
    let targetDistance = (maxDim / 2) / Math.tan(fov / 2) * 1.5;
    targetDistance = Math.max(targetDistance, 3);
    
    // Position camera at eye level (from generate-controller)
    const eyeLevel = center.y + size.y * 0.1;
    
    // Set camera position (matching generate-controller)
    this.camera.position.set(
        center.x,         // Centered horizontally
        eyeLevel,         // Eye level height
        center.z + targetDistance  // Distance from model
    );
    
    // Look at a point ABOVE the model center to push model down in viewport
    const lookAtPoint = new THREE.Vector3(
        center.x,
        center.y + size.y * 0.3,  // Look higher up (pushes model down)
        center.z
    );
    
    this.camera.lookAt(lookAtPoint);
    
    if (this.controls) {
        this.controls.target.copy(lookAtPoint);
        this.controls.update();
    }
}

    // Check like status
    async checkLikeStatus() {
        const isAuthenticated = await this.checkAuthentication();
        if (!isAuthenticated) {
            this.updateLikeButton(false);
            return;
        }
        
        try {
            const response = await fetch(`${this.getApiBaseUrl()}/auth/liked-assets`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const likedAssets = data.assets || [];
                this.isLiked = likedAssets.some(asset => asset._id === this.currentAssetId);
                this.updateLikeButton(this.isLiked);
            }
        } catch (error) {
            console.error('❌ Error checking like status:', error);
        }
    }

    // Update like button
    updateLikeButton(isLiked) {
        const likeBtn = document.getElementById('assetLikeBtn');
        if (likeBtn) {
            if (isLiked) {
                likeBtn.classList.add('liked');
            } else {
                likeBtn.classList.remove('liked');
            }
        }
        this.isLiked = isLiked;
    }

   async toggleLike() {
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
        console.log('❌ User not authenticated');
        if (window.authManager) {
            window.authManager.showLoginModal();
        }
        return;
    }
    
    try {
        const apiUrl = this.getApiBaseUrl();
        const authToken = localStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${apiUrl}/auth/like-asset`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({ assetId: this.currentAssetId })
        });
        
        if (response.ok) {
            const data = await response.json();
            this.updateLikeButton(data.isLiked);
            this.showFeedback(data.isLiked ? 'Added to likes!' : 'Removed from likes');
            
            // Update the liked models count in account section
            if (window.AppNavigation) {
                window.AppNavigation.updateLikedCount();
            }
        }
    } catch (error) {
        console.error('❌ Error toggling like:', error);
        this.showFeedback('Failed to update like status', 'error');
    }
}
async handleDownload() {
    console.log('Download button clicked');
    console.log('Auth manager available:', !!window.authManager);
    
    const isAuthenticated = await this.checkAuthentication();
    console.log('Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
        console.log('Not authenticated, should show login modal');
        if (window.authManager) {
            console.log('Showing auth manager login modal');
            window.authManager.showLoginModal();
        } else {
            console.log('No auth manager, showing feedback');
            this.showFeedback('Please log in to download models', 'error');
        }
        return;
    }
    
    // Show format modal directly
    const modal = document.getElementById('downloadFormatModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
        
        const modalContent = modal.querySelector('.download-modal-content');
        if (modalContent) {
            modalContent.style.opacity = '1';
            modalContent.style.visibility = 'visible';
        }
    }
}
async downloadAsset(format) {
    console.log('Downloading format:', format);
    
    this.closeDownloadModal();
    
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
        if (window.authManager) {
            window.authManager.showLoginModal();
        }
        return;
    }
    
    try {
        this.showFeedback('Preparing download...', 'info');
        
        const apiUrl = this.getApiBaseUrl();
        const authToken = localStorage.getItem('authToken');
        
        let downloadUrl;
        if (this.currentAsset.meshyTaskId) {
            downloadUrl = `${apiUrl}/assets/meshy/${this.currentAsset.meshyTaskId}/download?format=${format}`;
        } else {
            downloadUrl = `${apiUrl}/assets/${this.currentAssetId}/download?format=${format}`;
        }
        
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        console.log(`Fetching from: ${downloadUrl}`);
        
        // First, try to fetch the resource
        let response;
        try {
            response = await fetch(downloadUrl, {
                method: 'GET',
                credentials: 'include',
                headers: headers
            });
        } catch (fetchError) {
            console.error('Failed to fetch from server:', fetchError);
            throw new Error(`Server request failed: ${fetchError.message}`);
        }

        if (!response.ok) {
            // Handle 404 specifically
            if (response.status === 404) {
                // Try to get error details
                let errorMessage = `${format.toUpperCase()} format not available`;
                try {
                    const errorData = await response.json();
                    if (errorData.availableFormats) {
                        errorMessage = `${format.toUpperCase()} not available. Try: ${errorData.availableFormats.join(', ').toUpperCase()}`;
                    } else if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // Couldn't parse error response
                }
                throw new Error(errorMessage);
            }
            throw new Error(`Download failed (${response.status})`);
        }

        // Check Content-Type to determine response format
        const contentType = response.headers.get('content-type');
        console.log('Response Content-Type:', contentType);
        
        let blob;
        
        if (contentType && contentType.includes('application/json')) {
            // Server returned JSON with download URL
            console.log('Server returned JSON response');
            const data = await response.json();
            
            const fileUrl = data.downloadUrl;
            if (!fileUrl) {
                throw new Error('No download URL in response');
            }
            
            console.log(`Got download URL: ${fileUrl}`);
            
            // Fetch the actual file
            const fileResponse = await fetch(fileUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: data.isCloudinary ? 'omit' : 'include'
            });
            
            if (!fileResponse.ok) {
                throw new Error(`File download failed: ${fileResponse.status}`);
            }
            
            blob = await fileResponse.blob();
            
        } else {
            // Server returned the file directly (for Cloudinary proxy)
            console.log('Server returned file directly');
            blob = await response.blob();
        }
        
        console.log(`Downloaded ${format} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        
        const fileName = `${this.currentAsset.name || 'model'}.${format}`;
        
        // Mobile vs Web download handling (rest of your existing code)
        if (this.isPlatform('mobile-app')) {
            // Mobile download code...
           const { Filesystem } = Capacitor.Plugins;
            
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                const date = new Date().toISOString().split('T')[0];
                const fullFileName = `${this.currentAsset.name || 'model'}_${date}.${format}`;
                
                const result = await Filesystem.writeFile({
                    path: `Threely/${fullFileName}`,
                    data: base64String,
                    directory: 'Documents',
                    recursive: true
                });
                
                this.showFeedback(`Saved to Documents/Threely/${fullFileName}`, 'success', 4000);
            };
        } else {
            // Web download code...
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showFeedback(`${format.toUpperCase()} downloaded!`, 'success');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        this.showFeedback(error.message || 'Download failed', 'error');
    }
}

// Helper method to show download options on mobile
async showMobileDownloadOptions(fileName) {
    return new Promise((resolve) => {
        // Create a simple modal asking if user wants to share
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50000;
            padding: 2rem;
        `;
        
        modal.innerHTML = `
            <div style="
                background: rgba(10,10,10,0.95);
                border-radius: 16px;
                padding: 2rem;
                max-width: 320px;
                text-align: center;
                border: 1px solid rgba(0,188,212,0.3);
            ">
                <h3 style="color: white; font-family: 'Sora', sans-serif; margin-bottom: 1rem;">File Saved!</h3>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem; line-height: 1.4;">
                    ${fileName} has been saved to your device. Would you like to share it?
                </p>
                <div style="display: flex; gap: 1rem;">
                    <button id="shareBtn" style="
                        flex: 1;
                        background: #00bcd4;
                        color: white;
                        border: none;
                        padding: 0.8rem;
                        border-radius: 8px;
                        font-weight: 600;
                    ">Share</button>
                    <button id="closeBtn" style="
                        flex: 1;
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.2);
                        padding: 0.8rem;
                        border-radius: 8px;
                    ">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#shareBtn').onclick = () => {
            document.body.removeChild(modal);
            resolve(true);
        };
        
        modal.querySelector('#closeBtn').onclick = () => {
            document.body.removeChild(modal);
            resolve(false);
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
                resolve(false);
            }
        }, 5000);
    });
}

async handleShare() {
    // Check authentication first
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
        console.log('User not authenticated for sharing');
        if (window.authManager) {
            window.authManager.showLoginModal();
        } else {
            this.showFeedback('Please log in to share models', 'error');
        }
        return;
    }
    
    try {
        this.showFeedback('Creating export package...', 'info');
        
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded');
        }
        
        const zip = new JSZip();
        
        const apiUrl = this.getApiBaseUrl();
        const authToken = localStorage.getItem('authToken');
        const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
        
        // Define all formats to include
        const formats = ['glb', 'fbx', 'obj', 'usdz'];
        const modelName = this.currentAsset.name || 'model';
        
        // Create a folder in the zip
        const modelFolder = zip.folder(modelName);
        
     // Replace the downloadPromises section in handleShare with this:
// In handleShare method, replace the download section:
const downloadPromises = formats.map(async (format) => {
    try {
        let downloadUrl;
        if (this.currentAsset.meshyTaskId) {
            downloadUrl = `${apiUrl}/assets/meshy/${this.currentAsset.meshyTaskId}/download?format=${format}`;
        } else {
            downloadUrl = `${apiUrl}/assets/${this.currentAssetId}/download?format=${format}`;
        }
        
        console.log(`Fetching ${format} from: ${downloadUrl}`);
        
        const response = await fetch(downloadUrl, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        if (!response.ok) {
            console.warn(`${format} not available (${response.status})`);
            return false;
        }
        
        // Check Content-Type
        const contentType = response.headers.get('content-type');
        let blob;
        
        if (contentType && contentType.includes('application/json')) {
            // JSON response with URL
            const data = await response.json();
            if (!data.downloadUrl) return false;
            
            const fileResponse = await fetch(data.downloadUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: data.isCloudinary ? 'omit' : 'include'
            });
            
            if (!fileResponse.ok) return false;
            blob = await fileResponse.blob();
        } else {
            // Direct file response
            blob = await response.blob();
        }
        
        if (blob) {
            modelFolder.file(`${modelName}.${format}`, blob);
            console.log(`Added ${format} to zip`);
            return true;
        }
        
    } catch (error) {
        console.warn(`Failed to add ${format}:`, error);
        return false;
    }
});
        
        await Promise.all(downloadPromises);
        
        // Remove the README file creation - just generate the zip
        // Generate the zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `${modelName}_threely_export.zip`;
        
        // Always open email with attachment (works for both mobile and web)
        this.openEmailWithAttachment(zipBlob, zipFileName, modelName);
        
    } catch (error) {
        console.error('Export error:', error);
        this.showFeedback('Export failed. Please try again.', 'error');
    }
}

async openEmailWithAttachment(zipBlob, fileName, modelName) {
    try {
        // Check if running in Capacitor environment
      if (this.isPlatform('mobile-app')) {
            // Mobile: Use Capacitor Share plugin
            const { Filesystem, Directory, Share } = window.Capacitor.Plugins;
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(zipBlob);
            reader.onloadend = async () => {
                const base64String = reader.result.split(',')[1];
                
                // Save temporarily
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64String,
                    directory: Directory.Cache
                });
                
                // Use Capacitor Share plugin
                await Share.share({
                    title: `3D Model Export: ${modelName}`,
                    text: `Here's your 3D model "${modelName}" exported from Threely app. The ZIP file contains multiple formats (GLB, FBX, OBJ, USDZ).`,
                    url: result.uri,
                    dialogTitle: 'Share your 3D model'
                });
                
                this.showFeedback('Opening share options...', 'success');
            };
            
        } else {
            // Web: Create mailto link and download file
            const emailSubject = encodeURIComponent(`3D Model Export: ${modelName}`);
            const emailBody = encodeURIComponent(`Hi,\n\nI'm sharing my 3D model "${modelName}" exported from Threely app.\n\nThe attached ZIP file contains the model in multiple formats:\n- GLB: Universal 3D format\n- FBX: Game engine format\n- OBJ: 3D software format\n- USDZ: Apple AR format\n\nBest regards`);
            
            // Create a download link for the user to save the file first
            const url = window.URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Then open email client
            setTimeout(() => {
                window.location.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
            }, 1000);
            
            this.showFeedback('File downloaded. Email client will open shortly.', 'success', 4000);
        }
        
    } catch (error) {
        console.error('Email share error:', error);
        this.showFeedback('Could not open share options', 'error');
    }
}



toggleInfo() {
    const infoOverlay = document.getElementById('assetInfoOverlay');
    if (infoOverlay) {
        // Toggle visibility
        if (infoOverlay.style.display === 'none') {
            infoOverlay.style.display = 'block';
            infoOverlay.style.opacity = '1';
        } else {
            infoOverlay.style.display = 'none';
            infoOverlay.style.opacity = '0';
        }
    }
}
async checkAuthentication() {
    try {
        // Use the global auth manager if available
        if (window.authManager) {
            await window.authManager.waitForAuthCheck();
            return window.authManager.isAuthenticated();
        }
        
        // Fallback: direct API check
        const apiUrl = this.getApiBaseUrl();
        const authToken = localStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${apiUrl}/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        return response.ok;
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}
    // Show feedback
    showFeedback(message, type = 'success', duration = 3000) {
        // Remove existing feedback
        const existing = document.querySelector('.mobile-viewer-feedback');
        if (existing) existing.remove();
        
        const feedback = document.createElement('div');
        feedback.className = `mobile-viewer-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.display = 'block';
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(100px)';
            setTimeout(() => feedback.remove(), 300);
        }, duration);
    }

    // Show/hide states
    showLoadingState() {
        const loading = document.getElementById('viewerLoadingState');
        const error = document.getElementById('viewerErrorState');
        
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
    }

    hideLoadingState() {
        const loading = document.getElementById('viewerLoadingState');
        if (loading) loading.style.display = 'none';
    }

    showErrorState() {
        const loading = document.getElementById('viewerLoadingState');
        const error = document.getElementById('viewerErrorState');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'flex';
    }

   closeDownloadModal() {
    const modal = document.getElementById('downloadFormatModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }, 300);
    }
}

    closeViewer() {
    console.log('🔙 Closing asset viewer');
    
    const overlay = document.getElementById('mobileAssetViewer');
    if (overlay) {
        // Add closing animation
        overlay.classList.add('closing');
        overlay.classList.remove('active');
        
        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('closing');
            document.body.style.overflow = ''; // Restore body scroll
            
            // Cleanup
            this.cleanup();
        }, 400);
    }
}

    // Cleanup
    cleanup() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        
        if (this.scene) {
            this.scene.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene = null;
        }
        
        this.camera = null;
        this.controls = null;
        this.model = null;
        this.currentAsset = null;
        this.currentAssetId = null;
    }

    // Handle window resize
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        const container = document.getElementById('assetViewer3d');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Initialize and expose globally
window.MobileAssetViewer = new MobileAssetViewer();

// Add resize listener
window.addEventListener('resize', () => {
    if (window.MobileAssetViewer) {
        window.MobileAssetViewer.handleResize();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAssetViewer;
}