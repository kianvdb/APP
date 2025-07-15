// Admin User Models Manager JavaScript - Enhanced with Edit for Publishing
console.log('👑 Admin User Models Manager Loading...');

let currentModels = [];
let filteredModels = [];
let currentPage = 1;
let modelsPerPage = 12;
let selectedModelForDelete = null;
let currentAdminUserId = null; // Store the current admin's user ID

// Wait for config to be loaded
function getApiBaseUrl() {
    if (window.APP_CONFIG) {
        return window.APP_CONFIG.API_BASE_URL;
    } else if (window.DALMA_CONFIG) {
        return window.DALMA_CONFIG.API_BASE_URL;
    } else {
        // Fallback with protocol detection
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
        return isDev ? `http://${hostname}:3000/api` : `${protocol}//${hostname}/api`;
    }
}

// Mobile navigation toggle function
function toggleMobileNav() {
    const mobileNav = document.getElementById('mobileNav');
    const hamburger = document.querySelector('.hamburger');
    mobileNav.classList.toggle('active');
    hamburger.classList.toggle('active');
}

window.toggleMobileNav = toggleMobileNav;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Admin User Models page initializing...');
    console.log('📡 API Base URL:', getApiBaseUrl());
    
    // Check admin authentication first
    const authValid = await checkAdminAuthenticationAndRedirect();
    if (!authValid) {
        // Authentication redirect already handled in checkAdminAuthenticationAndRedirect
        return;
    }
    
    // Initialize event listeners first
    setupEventListeners();
    
    // Then load user models
    await loadUserModels();
    
    console.log('✅ Admin User Models page initialized');
});

// Check if user is admin, redirect if not
async function checkAdminAuthenticationAndRedirect() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('❌ User not authenticated, redirecting to login');
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = 'login.html';
            return false;
        }
        
        const data = await response.json();
        
        if (!data.user.isAdmin) {
            console.log('❌ User is not admin, redirecting to homepage');
            alert('Access denied. Admin privileges required.');
            window.location.href = 'homepage.html';
            return false;
        }
        
        // Store the admin's user ID for filtering
        currentAdminUserId = data.user.id || data.user._id;
        
        console.log('✅ Admin authenticated:', data.user.username);
        console.log('👤 Admin user ID:', currentAdminUserId);
        return true;
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Show/hide processing overlay
function showProcessingOverlay(message = 'Processing...') {
    const overlay = document.getElementById('processingOverlay');
    const text = overlay?.querySelector('.processing-text');
    
    if (overlay) {
        overlay.style.display = 'flex';
        if (text) text.textContent = message;
    }
}

function hideProcessingOverlay() {
    const overlay = document.getElementById('processingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Show delete modal
function showDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
        }, 10);
    }
}

// Hide delete modal
function hideDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            selectedModelForDelete = null;
        }, 300);
    }
}

// ENHANCED: Delete model with generation parameters info
function deleteModel(modelId, modelName) {
    selectedModelForDelete = { id: modelId, name: modelName };
    
    // Find the model in current models for more details
    const model = currentModels.find(m => m._id === modelId);
    
    // Helper function to format topology text
    const formatTopology = (topology) => {
        if (!topology) return 'Triangles';
        const lowerTopology = topology.toLowerCase().trim();
        const topologyMap = {
            'triangle': 'Triangles',
            'triangles': 'Triangles',
            'quad': 'Quads',
            'quads': 'Quads'
        };
        return topologyMap[lowerTopology] || 'Triangles';
    };
    
    // Populate delete modal with enhanced info
    const deleteModelInfo = document.getElementById('deleteModelInfo');
    if (deleteModelInfo && model) {
        // Extract generation parameters
        const topology = model.topology || model.generationMetadata?.topology || 'triangle';
        const hasTexture = model.texture !== undefined ? model.texture : (model.generationMetadata?.hasTexture !== undefined ? model.generationMetadata.hasTexture : true);
        const symmetry = model.symmetry || model.generationMetadata?.symmetry || 'Auto';
        const pbrEnabled = model.pbr !== undefined ? model.pbr : (model.generationMetadata?.pbrEnabled || false);
        const polygons = model.polygons || model.generationMetadata?.targetPolycount || 0;
        
        deleteModelInfo.innerHTML = `
            <h4 style="color: white; margin: 0.5rem 0;">${escapeHtml(modelName)}</h4>
            <p><strong>User:</strong> ${escapeHtml(model.user?.username || 'Unknown')}</p>
            <p><strong>Created:</strong> ${new Date(model.createdAt).toLocaleDateString()}</p>
            <p><strong>Formats:</strong> ${(model.availableFormats || ['glb']).join(', ').toUpperCase()}</p>
            ${model.meshyTaskId ? `
            <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="margin: 0.25rem 0;"><strong>🔺 Topology:</strong> ${formatTopology(topology)}</p>
                <p style="margin: 0.25rem 0;"><strong>🎨 Texture:</strong> ${hasTexture ? 'Yes' : 'No'}</p>
                <p style="margin: 0.25rem 0;"><strong>🔄 Symmetry:</strong> ${symmetry.charAt(0).toUpperCase() + symmetry.slice(1)}</p>
                <p style="margin: 0.25rem 0;"><strong>🔢 Polygons:</strong> ${polygons.toLocaleString()}</p>
                ${pbrEnabled ? '<p style="margin: 0.25rem 0;"><strong>💎 PBR:</strong> Enabled</p>' : ''}
            </div>
            ` : ''}
        `;
    }
    
    showDeleteModal();
    console.log('🗑️ Preparing to delete model:', modelName);
}

// Confirm delete
async function handleConfirmDelete() {
    if (!selectedModelForDelete) return;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    try {
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';
        }
        
        console.log('🗑️ Confirming delete for model:', selectedModelForDelete.id);
        
        const response = await fetch(`${getApiBaseUrl()}/assets/admin/user-models/${selectedModelForDelete.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Model deleted successfully:', data.message);
        
        hideDeleteModal();
        showStatusMessage(`Model "${selectedModelForDelete.name}" deleted successfully`, 3000);
        
        // Reload data
        await loadUserModels();
        
    } catch (error) {
        console.error('❌ Error deleting model:', error);
        showStatusMessage('Failed to delete model. Please try again.', 3000);
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Delete Permanently';
        }
        selectedModelForDelete = null;
    }
}

// FIXED: Edit for Publishing function with proper modelFile structure
async function editForPublishing(modelId) {
    console.log('✏️ Edit for publishing clicked:', modelId);
    
    // Find the model in current models
    const model = currentModels.find(m => m._id === modelId);
    if (!model) {
        console.error('❌ Model not found for editing');
        showStatusMessage('Model not found', 3000);
        return;
    }
    
    // Show processing overlay
    showProcessingOverlay('Preparing model for editing...');
    
    try {
        // Fetch full model details to ensure we have all data
        const response = await fetch(`${getApiBaseUrl()}/assets/admin/user-models/${modelId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch model details: ${response.status}`);
        }
        
        const data = await response.json();
        const fullModel = data.model;
        
        console.log('📋 Full model data retrieved:', fullModel);
        console.log('🔺 Topology value found:', fullModel.topology);
        
        // ENHANCED: Extract generation parameters with multiple fallback sources
        const extractedParams = {
            topology: fullModel.topology || fullModel.generationMetadata?.topology || 'triangle',
            texture: fullModel.texture !== undefined ? fullModel.texture : (fullModel.generationMetadata?.hasTexture !== undefined ? fullModel.generationMetadata.hasTexture : true),
            symmetry: fullModel.symmetry || fullModel.generationMetadata?.symmetry || 'auto',
            pbr: fullModel.pbr !== undefined ? fullModel.pbr : (fullModel.generationMetadata?.pbrEnabled || false),
            polygons: fullModel.polygons || fullModel.generationMetadata?.targetPolycount || 30000
        };
        
        console.log('🔧 Extracted generation parameters:', extractedParams);
        console.log('🔺 Topology being transferred:', extractedParams.topology);
        
        // CRITICAL FIX: Ensure proper model file structure
        let modelFiles = fullModel.modelFiles || {};
        let modelFile = fullModel.modelFile || null;
        
        // If modelFiles is empty but modelFile exists, create modelFiles structure
        if ((!modelFiles.glb || Object.keys(modelFiles).length === 0) && modelFile && modelFile.url) {
            console.log('📋 Converting legacy modelFile to modelFiles structure');
            modelFiles = {
                glb: {
                    filename: modelFile.filename || 'model.glb',
                    url: modelFile.url,
                    publicId: modelFile.publicId || 'model-glb',
                    size: modelFile.size || 0
                }
            };
        }
        
        // Ensure modelFile exists if we have modelFiles.glb
        if (modelFiles.glb && (!modelFile || !modelFile.url)) {
            modelFile = {
                filename: modelFiles.glb.filename || 'model.glb',
                url: modelFiles.glb.url,
                publicId: modelFiles.glb.publicId || 'model-glb',
                size: modelFiles.glb.size || 0
            };
        }
        
        console.log('📋 Final model files structure:', {
            hasModelFiles: !!modelFiles,
            modelFilesKeys: Object.keys(modelFiles),
            hasModelFile: !!modelFile,
            modelFileUrl: modelFile?.url
        });
        
        // Prepare model data for manageAssets page
        const modelData = {
            _id: fullModel._id,
            name: fullModel.name || `User Model ${fullModel._id.slice(-6)}`,
            breed: fullModel.breed || 'Mixed Breed',
            icon: fullModel.icon || '🐕',
            fileSize: fullModel.fileSize || 'Unknown',
            polygons: extractedParams.polygons,
            popularity: fullModel.popularity || 0,
            tags: fullModel.tags || ['user-generated', 'ai'],
            description: fullModel.description || 'User-generated 3D model',
            
            // CRITICAL: Include both modelFiles AND modelFile
            modelFiles: modelFiles,
            modelFile: modelFile,
            availableFormats: fullModel.availableFormats || ['glb'],
            
            // Include images
            originalImage: fullModel.originalImage || null,
            previewImage: fullModel.previewImage || null,
            
            // Include metadata
            meshyTaskId: fullModel.meshyTaskId || null,
            originalUserId: fullModel.user?.id || fullModel.userId,
            originalUsername: fullModel.user?.username || 'Unknown User',
            isUserGenerated: true,
            sourceAssetId: fullModel._id,
            createdAt: fullModel.createdAt,
            
            // ENHANCED: Include all generation parameters for accurate editing
            topology: extractedParams.topology,
            texture: extractedParams.texture,
            symmetry: extractedParams.symmetry,
            pbr: extractedParams.pbr,
            
            // Enhanced generation metadata
            generationMetadata: {
                topology: extractedParams.topology,
                hasTexture: extractedParams.texture,
                symmetry: extractedParams.symmetry,
                pbrEnabled: extractedParams.pbr,
                targetPolycount: extractedParams.polygons,
                generatedAt: fullModel.generationMetadata?.generatedAt || fullModel.createdAt,
                isMeshyGenerated: true,
                originalGenerationParams: extractedParams
            },
            
            // Flag for manageAssets to know this is a publish workflow
            isPublishWorkflow: true
        };
        
        // Store in sessionStorage for manageAssets page to retrieve
        sessionStorage.setItem('pendingPublishModel', JSON.stringify(modelData));
        sessionStorage.setItem('publishWorkflowActive', 'true');
        
        console.log('💾 Enhanced model data stored in sessionStorage');
        console.log('🔺 Topology in stored data:', modelData.topology);
        console.log('📋 ModelFile URL:', modelData.modelFile?.url);
        console.log('📋 ModelFiles GLB URL:', modelData.modelFiles?.glb?.url);
        console.log('🚀 Redirecting to manageAssets.html...');
        
        // Hide processing overlay
        hideProcessingOverlay();
        
        // Redirect to manageAssets page
        window.location.href = 'manageAssets.html?publishMode=true';
        
    } catch (error) {
        console.error('❌ Error preparing model for publishing:', error);
        hideProcessingOverlay();
        showStatusMessage('Failed to prepare model for publishing: ' + error.message, 3000);
    }
}

// Setup event listeners
function setupEventListeners() {
    const creatorFilter = document.getElementById('creatorFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const retryBtn = document.getElementById('retryBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const emptyRefreshBtn = document.getElementById('emptyRefreshBtn');
    
    // Creator filter functionality
    if (creatorFilter) {
        creatorFilter.addEventListener('change', handleCreatorFilter);
    }
    
    // Refresh functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            loadUserModels();
        });
    }
    
    // Empty state refresh button
    if (emptyRefreshBtn) {
        emptyRefreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            loadUserModels();
        });
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            loadUserModels();
        });
    }
    
    // Pagination
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(currentPage - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(currentPage + 1);
        });
    }
    
    // Modal event listeners
    setupModalEventListeners();
    
    console.log('✅ Event listeners set up');
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Delete modal
    const deleteModalClose = document.getElementById('deleteModalClose');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteModal = document.getElementById('deleteConfirmModal');
    
    // Delete modal handlers
    if (deleteModalClose) {
        deleteModalClose.addEventListener('click', hideDeleteModal);
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
    }
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                hideDeleteModal();
            }
        });
    }
}

// Load user models from API
async function loadUserModels() {
    // Prevent any navigation
    if (window.event) {
        window.event.preventDefault();
        window.event.stopPropagation();
    }
    
    showLoadingState();
    
    try {
        console.log('📥 Loading user models...');
        
        // Double-check we're still authenticated
        const authCheck = await fetch(`${getApiBaseUrl()}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!authCheck.ok) {
            console.log('❌ Auth check failed, staying on page');
            showErrorState();
            return;
        }
        
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: modelsPerPage,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });
        
        const response = await fetch(`${getApiBaseUrl()}/assets/admin/user-models?${queryParams}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentModels = data.models || [];
        
        console.log('✅ User models loaded:', currentModels.length);
        console.log('📊 Summary:', data.summary);
        
        // Apply current filter
        applyCurrentFilter();
        
        if (filteredModels.length === 0) {
            showEmptyState();
        } else {
            renderAssets();
            updatePagination(data.pagination);
        }
        
    } catch (error) {
        console.error('❌ Error loading user models:', error);
        showErrorState();
    }
}

// Apply current filter
function applyCurrentFilter() {
    const creatorFilter = document.getElementById('creatorFilter');
    const filterValue = creatorFilter?.value || 'all';
    
    console.log('🔍 Applying creator filter:', filterValue);
    console.log('👤 Current admin user ID:', currentAdminUserId);
    
    switch (filterValue) {
        case 'my-models':
            // Show only models created by the current admin
            filteredModels = currentModels.filter(model => {
                const modelUserId = model.user?.id || model.user?._id;
                return modelUserId && modelUserId.toString() === currentAdminUserId?.toString();
            });
            console.log(`📋 Filtered to admin's models: ${filteredModels.length} models`);
            break;
            
        case 'other-users':
            // Show only models created by other users (not the current admin)
            filteredModels = currentModels.filter(model => {
                const modelUserId = model.user?.id || model.user?._id;
                return !modelUserId || modelUserId.toString() !== currentAdminUserId?.toString();
            });
            console.log(`📋 Filtered to other users' models: ${filteredModels.length} models`);
            break;
            
        default: // 'all'
            filteredModels = [...currentModels];
            console.log(`📋 Showing all models: ${filteredModels.length} models`);
            break;
    }
}

// Show loading state
function showLoadingState() {
    const elements = {
        loading: document.getElementById('loadingSpinner'),
        grid: document.getElementById('assetsGrid'),
        empty: document.getElementById('emptyState'),
        error: document.getElementById('errorState'),
        pagination: document.getElementById('pagination')
    };
    
    if (elements.loading) elements.loading.style.display = 'flex';
    if (elements.grid) elements.grid.style.display = 'none';
    if (elements.empty) elements.empty.style.display = 'none';
    if (elements.error) elements.error.style.display = 'none';
    if (elements.pagination) elements.pagination.style.display = 'none';
}

// Show empty state
function showEmptyState() {
    const elements = {
        loading: document.getElementById('loadingSpinner'),
        grid: document.getElementById('assetsGrid'),
        empty: document.getElementById('emptyState'),
        error: document.getElementById('errorState'),
        pagination: document.getElementById('pagination')
    };
    
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.grid) elements.grid.style.display = 'none';
    if (elements.empty) {
        elements.empty.style.display = 'block';
        
        // Re-attach event listener to empty refresh button
        const emptyRefreshBtn = document.getElementById('emptyRefreshBtn');
        if (emptyRefreshBtn) {
            // Remove any existing listeners
            const newBtn = emptyRefreshBtn.cloneNode(true);
            emptyRefreshBtn.parentNode.replaceChild(newBtn, emptyRefreshBtn);
            
            // Add new listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🔄 Empty refresh button clicked - loading models...');
                loadUserModels();
                return false;
            });
        }
    }
    if (elements.error) elements.error.style.display = 'none';
    if (elements.pagination) elements.pagination.style.display = 'none';
}

// Show error state
function showErrorState() {
    const elements = {
        loading: document.getElementById('loadingSpinner'),
        grid: document.getElementById('assetsGrid'),
        empty: document.getElementById('emptyState'),
        error: document.getElementById('errorState'),
        pagination: document.getElementById('pagination')
    };
    
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.grid) elements.grid.style.display = 'none';
    if (elements.empty) elements.empty.style.display = 'none';
    if (elements.error) {
        elements.error.style.display = 'block';
        // Make sure retry button is properly set up
        const retryButton = elements.error.querySelector('#retryBtn');
        if (retryButton) {
            retryButton.onclick = function(e) {
                e.preventDefault();
                loadUserModels();
                return false;
            };
        }
    }
    if (elements.pagination) elements.pagination.style.display = 'none';
}

// Render assets grid
function renderAssets() {
    const assetsGrid = document.getElementById('assetsGrid');
    
    // Hide other states
    const elements = {
        loading: document.getElementById('loadingSpinner'),
        empty: document.getElementById('emptyState'),
        error: document.getElementById('errorState')
    };
    
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.empty) elements.empty.style.display = 'none';
    if (elements.error) elements.error.style.display = 'none';
    
    if (filteredModels.length === 0) {
        assetsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <h3 style="color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem;">No models match your filters</h3>
                <p style="color: rgba(255, 255, 255, 0.6);">Try adjusting your search or filters</p>
            </div>
        `;
    } else {
        assetsGrid.innerHTML = filteredModels.map(createAssetCard).join('');
    }
    
    if (assetsGrid) assetsGrid.style.display = 'grid';
    
    console.log(`📊 Rendered ${filteredModels.length} assets`);
}

// ENHANCED: Create asset card with edit, delete, and upload status buttons
function createAssetCard(model) {
    // Get image URL with fallback priority
    let imageUrl = null;
    let imageSource = null;
    
    // Priority: originalImage > previewImage > icon fallback
    if (model.originalImage && model.originalImage.url) {
        imageUrl = model.originalImage.url;
        imageSource = 'original';
    } else if (model.previewImage && model.previewImage.url) {
        imageUrl = model.previewImage.url;
        imageSource = 'preview';
    }
    
    const hasImage = !!imageUrl;
    const isMeshy = model.generationMetadata?.isMeshyGenerated || !!model.meshyTaskId;
    const isPublished = model.wasUserGenerated || model.publishedToHomepage || false;
    const createdDate = new Date(model.createdAt).toLocaleDateString();
    const previewId = `preview-${model._id}`;
    
    // Extract generation parameters for display with proper priority
    const topology = model.topology || model.generationMetadata?.topology || 'triangle';
    const hasTexture = model.texture !== undefined ? model.texture : (model.generationMetadata?.hasTexture !== undefined ? model.generationMetadata.hasTexture : true);
    const symmetry = model.symmetry || model.generationMetadata?.symmetry || 'auto';
    const pbrEnabled = model.pbr !== undefined ? model.pbr : (model.generationMetadata?.pbrEnabled || false);
    const polygons = model.polygons || model.generationMetadata?.targetPolycount || 0;
    
    // Helper function to format topology text
    const formatTopology = (topology) => {
        if (!topology) return 'Triangles';
        const lowerTopology = topology.toString().toLowerCase().trim();
        const topologyMap = {
            'triangle': 'Triangles',
            'triangles': 'Triangles',
            'quad': 'Quads',
            'quads': 'Quads'
        };
        return topologyMap[lowerTopology] || 'Triangles';
    };
    
    const formattedTopology = formatTopology(topology);
    
    return `
        <div class="asset-card" data-asset-id="${model._id}" onclick="viewAsset('${model._id}')">
            <!-- Preview section with action buttons -->
            <div class="asset-preview" id="${previewId}">
                ${hasImage 
                    ? `
                        <img 
                            src="${imageUrl}" 
                            alt="${escapeHtml(model.name)}" 
                            class="asset-preview-img"
                            onload="handleImageLoad('${model._id}', '${previewId}', true)"
                            onerror="handleImageError('${model._id}', '${previewId}', '${escapeHtml(model.name)}', '🐕')"
                        >
                    ` 
                    : `<div class="asset-icon">🐕</div>`
                }
                
                <!-- Action buttons -->
                <div class="asset-actions">
                    <button class="action-btn upload-status-btn ${isPublished ? 'uploaded' : 'not-uploaded'}" 
                            onclick="event.stopPropagation(); toggleUploadStatus('${model._id}', ${isPublished})" 
                            title="${isPublished ? 'Model is uploaded to homepage' : 'Model not uploaded to homepage'}">
                        ${isPublished ? '✅' : '📤'}
                    </button>
                    <button class="action-btn edit-btn" onclick="event.stopPropagation(); editForPublishing('${model._id}')" title="Edit for Publishing">
                        ✏️
                    </button>
                    <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteModel('${model._id}', '${escapeHtml(model.name)}')" title="Delete model">
                        🗑️
                    </button>
                </div>
            </div>
            
            <!-- Asset info with user information and generation parameters -->
            <div class="asset-info">
                <h3 class="asset-name">${escapeHtml(model.name)}</h3>
                
                <div class="asset-details">
                    <div class="asset-stats">
                        <span class="asset-user">👤 ${escapeHtml(model.user?.username || 'Unknown User')}</span>
                        <span>📅 ${createdDate}</span>
                    </div>
                </div>
                
                <!-- Generation Parameters Display (if AI generated) -->
                ${isMeshy ? `
                <div class="generation-params">
                    <div class="param-row">
                        <span class="param-label">🔺 ${formattedTopology}</span>
                        <span class="param-label">🎨 ${hasTexture ? 'Textured' : 'No Texture'}</span>
                    </div>
                    <div class="param-row">
                        <span class="param-label">🔄 ${symmetry.charAt(0).toUpperCase() + symmetry.slice(1)}</span>
                        <span class="param-label">🔢 ${polygons.toLocaleString()}</span>
                    </div>
                    ${pbrEnabled ? `
                    <div class="param-row">
                        <span class="param-label">💎 PBR Enabled</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Toggle upload status (publish/unpublish to homepage)
async function toggleUploadStatus(modelId, currentStatus) {
    try {
        console.log(`🔄 Toggling upload status for model: ${modelId} (currently ${currentStatus ? 'uploaded' : 'not uploaded'})`);
        
        showStatusMessage('Updating upload status...', 1000);
        
        // Find the button to update its visual state immediately
        const button = document.querySelector(`[onclick*="toggleUploadStatus('${modelId}'"]`);
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.6';
        }
        
        // Make API call to toggle upload status
        const response = await fetch(`${getApiBaseUrl()}/assets/admin/user-models/${modelId}/toggle-upload`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Upload status toggled:', data.message);
        showStatusMessage(data.message, 2000);
        
        // Reload models to reflect changes
        await loadUserModels();
        
    } catch (error) {
        console.error('❌ Error toggling upload status:', error);
        showStatusMessage('Failed to update upload status', 3000);
        
        // Re-enable button on error
        const button = document.querySelector(`[onclick*="toggleUploadStatus('${modelId}'"]`);
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
        }
    }
}

// Handle image load success
function handleImageLoad(assetId, previewId, success) {
    console.log(`✅ Image loaded successfully for asset: ${assetId}`);
    
    const previewDiv = document.getElementById(previewId);
    const img = previewDiv?.querySelector('.asset-preview-img');
    
    if (img) {
        img.style.opacity = '1';
        img.classList.add('loaded');
    }
}

// Handle image load error with all action buttons
function handleImageError(assetId, previewId, assetName, icon) {
    console.error(`❌ Image failed to load for asset: ${assetId}`);
    
    const previewDiv = document.getElementById(previewId);
    const img = previewDiv?.querySelector('.asset-preview-img');
    
    if (previewDiv) {
        // Hide the image
        if (img) img.style.display = 'none';
        
        // Find the model to get its published status
        const model = currentModels.find(m => m._id === assetId);
        const isPublished = model ? (model.wasUserGenerated || model.publishedToHomepage || false) : false;
        
        // Show fallback icon with all action buttons
        previewDiv.innerHTML = `
            <div class="asset-icon">${icon}</div>
            <div class="asset-actions">
                <button class="action-btn upload-status-btn ${isPublished ? 'uploaded' : 'not-uploaded'}" 
                        onclick="event.stopPropagation(); toggleUploadStatus('${assetId}', ${isPublished})" 
                        title="${isPublished ? 'Model is uploaded to homepage' : 'Model not uploaded to homepage'}">
                    ${isPublished ? '✅' : '📤'}
                </button>
                <button class="action-btn edit-btn" onclick="event.stopPropagation(); editForPublishing('${assetId}')" title="Edit for Publishing">
                    ✏️
                </button>
                <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteModel('${assetId}', '${assetName}')" title="Delete model">
                    🗑️
                </button>
            </div>
        `;
    }
}

// Make image handlers globally available
window.handleImageLoad = handleImageLoad;
window.handleImageError = handleImageError;

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle creator filter change
function handleCreatorFilter() {
    console.log('👥 Creator filter changed');
    applyCurrentFilter();
    currentPage = 1;
    renderAssets();
    updatePagination({ totalPages: 1, currentPage: 1 }); // Simple pagination for filtered results
}

// Update pagination
function updatePagination(paginationData) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!pagination || !paginationData) return;
    
    const { currentPage: serverPage, totalPages, hasNextPage, hasPrevPage } = paginationData;
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    if (prevBtn) {
        prevBtn.disabled = !hasPrevPage;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !hasNextPage;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${serverPage || currentPage} of ${totalPages}`;
    }
}

// Change page
function changePage(newPage) {
    if (newPage < 1) return;
    
    currentPage = newPage;
    loadUserModels();
    
    // Scroll to top of assets
    const assetsGrid = document.getElementById('assetsGrid');
    if (assetsGrid) {
        assetsGrid.scrollIntoView({ behavior: 'smooth' });
    }
}

// View asset - Navigate to view-asset.html
function viewAsset(assetId) {
    console.log('🎯 Viewing asset from admin:', assetId);
    // Set session storage to remember we came from admin
    sessionStorage.setItem('lastAssetsPage', 'admin');
    // Navigate to view-asset page
    window.location.href = `view-asset.html?id=${assetId}&from=admin`;
}

// Status message utility
function showStatusMessage(message, duration = 3000) {
    let statusMsg = document.getElementById('tempStatusMessage');
    if (!statusMsg) {
        statusMsg = document.createElement('div');
        statusMsg.id = 'tempStatusMessage';
        statusMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 188, 212, 0.9);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            font-family: 'Sora', sans-serif;
            font-weight: 500;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 188, 212, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusMsg);
    }
    
    statusMsg.textContent = message;
    
    setTimeout(() => {
        statusMsg.style.opacity = '1';
        statusMsg.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        statusMsg.style.opacity = '0';
        statusMsg.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (statusMsg.parentNode) {
                statusMsg.parentNode.removeChild(statusMsg);
            }
        }, 300);
    }, duration);
}

// Make functions globally available
window.viewAsset = viewAsset;
window.toggleUploadStatus = toggleUploadStatus;
window.editForPublishing = editForPublishing;
window.deleteModel = deleteModel;
window.hideDeleteModal = hideDeleteModal;
window.loadUserModels = loadUserModels;

console.log('✅ Admin User Models Manager Loaded Successfully');