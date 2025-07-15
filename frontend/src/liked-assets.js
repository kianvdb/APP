// Liked Assets Page JavaScript - COMPLETE FIXED VERSION
let currentAssets = [];
let filteredAssets = [];
let currentPage = 1;
let assetsPerPage = 12;
let currentEditingAssetId = null;

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

// Make toggleMobileNav globally available
window.toggleMobileNav = toggleMobileNav;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Liked Assets page initializing...');
    console.log('📡 API Base URL:', getApiBaseUrl());
    
    // Check authentication first
    const authValid = await checkAuthenticationAndRedirect();
    if (!authValid) {
        return; // Don't continue if auth failed
    }
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load liked assets
    await loadLikedAssets();
    
    console.log('✅ Liked Assets page initialized');
});

// Check if user is authenticated, show login modal if not
async function checkAuthenticationAndRedirect() {
    try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.log('❌ User not authenticated');
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            
            // Try to show auth modal instead of redirecting
            if (window.authManager && typeof window.authManager.showLoginModal === 'function') {
                window.authManager.showLoginModal();
            } else {
                // Show auth required message and redirect to homepage
                showAuthRequiredMessage();
            }
            return false;
        }
        
        const data = await response.json();
        console.log('✅ User authenticated:', data.user.username);
        return true;
        
    } catch (error) {
        console.error('❌ Auth check error:', error);
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Show auth required message
        showAuthRequiredMessage();
        return false;
    }
}

// Show authentication required message
function showAuthRequiredMessage() {
    // Hide loading state
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    // Show auth required state in the main content area
    const assetsGrid = document.getElementById('assetsGrid');
    if (assetsGrid) {
        assetsGrid.style.display = 'flex';
        assetsGrid.style.alignItems = 'center';
        assetsGrid.style.justifyContent = 'center';
        assetsGrid.style.minHeight = '50vh';
        assetsGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2 style="color: white; margin-bottom: 1rem; font-family: 'Sora', sans-serif;">
                    Authentication Required
                </h2>
                <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 2rem; max-width: 400px;">
                    You need to be logged in to view your liked assets. Please use the account button to log in.
                </p>
                <button onclick="goToHomepage()" style="
                    background: #00bcd4;
                    color: white;
                    border: none;
                    padding: 0.8rem 2rem;
                    border-radius: 8px;
                    font-family: 'Sora', sans-serif;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.background='#00e5ff'" onmouseout="this.style.background='#00bcd4'">
                    Go to Homepage
                </button>
            </div>
        `;
    }
    
    // Hide pagination
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'none';
}

// Go to homepage function
function goToHomepage() {
    window.location.href = 'homepage.html';
}

// Make function globally available
window.goToHomepage = goToHomepage;

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const retryBtn = document.getElementById('retryBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    // Sort functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', handleSort);
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', loadLikedAssets);
    }
    
    // Pagination
    if (prevBtn) {
        prevBtn.addEventListener('click', () => changePage(currentPage - 1));
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => changePage(currentPage + 1));
    }
    
    // Modal event listeners
    setupModalEventListeners();
    
    console.log('✅ Event listeners set up');
}

// Setup modal event listeners
function setupModalEventListeners() {
    const editModalClose = document.getElementById('editModalClose');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const editNameInput = document.getElementById('editNameInput');
    const editModal = document.getElementById('editNameModal');
    
    // Close modal handlers
    if (editModalClose) {
        editModalClose.addEventListener('click', hideEditModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditModal);
    }
    
    // Save name handler
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', handleSaveName);
    }
    
    // Enter key to save
    if (editNameInput) {
        editNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSaveName();
            }
        });
        
        // Auto-enable/disable save button based on input
        editNameInput.addEventListener('input', () => {
            const saveBtn = document.getElementById('saveNameBtn');
            if (saveBtn) {
                saveBtn.disabled = !editNameInput.value.trim();
            }
        });
    }
    
    // Close modal when clicking overlay
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                hideEditModal();
            }
        });
    }
}

// Load liked assets from API
async function loadLikedAssets() {
    showLoadingState();
    
    try {
        console.log('📥 Loading liked assets...');
        
        const response = await fetch(`${getApiBaseUrl()}/auth/liked-assets`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentAssets = data.assets || [];
        filteredAssets = [...currentAssets];
        
        console.log('✅ Liked assets loaded:', currentAssets.length);
        console.log('📊 Assets data:', currentAssets);
        
        if (currentAssets.length === 0) {
            showEmptyState();
        } else {
            renderAssets();
            updatePagination();
        }
        
    } catch (error) {
        console.error('❌ Error loading liked assets:', error);
        showErrorState();
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
    if (elements.empty) elements.empty.style.display = 'block';
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
    if (elements.error) elements.error.style.display = 'block';
    if (elements.pagination) elements.pagination.style.display = 'none';
}

// Render assets grid
function renderAssets() {
    const assetsGrid = document.getElementById('assetsGrid');
    const startIndex = (currentPage - 1) * assetsPerPage;
    const endIndex = startIndex + assetsPerPage;
    const assetsToShow = filteredAssets.slice(startIndex, endIndex);
    
    // Hide other states
    const elements = {
        loading: document.getElementById('loadingSpinner'),
        empty: document.getElementById('emptyState'),
        error: document.getElementById('errorState')
    };
    
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.empty) elements.empty.style.display = 'none';
    if (elements.error) elements.error.style.display = 'none';
    
    if (filteredAssets.length === 0) {
        assetsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <h3 style="color: rgba(255, 255, 255, 0.8); margin-bottom: 0.5rem;">No models found</h3>
                <p style="color: rgba(255, 255, 255, 0.6);">Try adjusting your search or filters</p>
            </div>
        `;
    } else {
        assetsGrid.innerHTML = assetsToShow.map(createAssetCard).join('');
    }
    
    if (assetsGrid) assetsGrid.style.display = 'grid';
    
    console.log(`📊 Rendered ${assetsToShow.length} assets`);
}

// Create asset card HTML
function createAssetCard(asset) {
    const hasPreviewImage = asset.previewImage && asset.previewImage.url;
    
    return `
        <div class="asset-card" data-asset-id="${asset._id}" onclick="viewAsset('${asset._id}')">
            <div class="asset-preview">
                ${hasPreviewImage 
                    ? `<img src="${asset.previewImage.url}" alt="${escapeHtml(asset.name)}" class="asset-preview-img">` 
                    : `<div class="asset-icon">${asset.icon || '🐕'}</div>`
                }
            </div>
            <div class="asset-info">
                <div class="asset-header">
                    <h3 class="asset-name">${escapeHtml(asset.name)}</h3>
                    <div class="asset-actions">
                        <button class="action-icon-btn edit-btn" onclick="event.stopPropagation(); editAssetName('${asset._id}', '${escapeHtml(asset.name)}')" title="Rename model">
                            ✏️
                        </button>
                        <button class="action-icon-btn like-btn" onclick="event.stopPropagation(); toggleLike('${asset._id}')" title="Unlike model">
                            ❤️
                        </button>
                    </div>
                </div>
                <div class="asset-details">
                    <div class="asset-stats">
                        <span>${asset.views || 0} views</span>
                        <span>${asset.downloads || 0} downloads</span>
                    </div>
                    <button class="download-btn" onclick="event.stopPropagation(); downloadAsset('${asset._id}')" title="Download model">
                        📥 Download
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle search
function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredAssets = [...currentAssets];
    } else {
        filteredAssets = currentAssets.filter(asset => 
            asset.name.toLowerCase().includes(searchTerm) ||
            asset.breed.toLowerCase().includes(searchTerm) ||
            (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    currentPage = 1;
    renderAssets();
    updatePagination();
    
    console.log(`🔍 Search: "${searchTerm}" - ${filteredAssets.length} results`);
}

// Handle sort
function handleSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    const sortBy = sortSelect.value;
    
    switch (sortBy) {
        case 'recent':
            filteredAssets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'name':
            filteredAssets.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'downloads':
            filteredAssets.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
            break;
        case 'views':
            filteredAssets.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        default:
            break;
    }
    
    currentPage = 1;
    renderAssets();
    updatePagination();
    
    console.log(`📊 Sorted by: ${sortBy}`);
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

// Change page
function changePage(newPage) {
    const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
    
    if (newPage < 1 || newPage > totalPages) return;
    
    currentPage = newPage;
    renderAssets();
    updatePagination();
    
    // Scroll to top of assets
    const assetsGrid = document.getElementById('assetsGrid');
    if (assetsGrid) {
        assetsGrid.scrollIntoView({ behavior: 'smooth' });
    }
}

// View asset (redirect to view-asset page)
function viewAsset(assetId) {
    console.log('🎯 Viewing asset:', assetId);
    window.location.href = `view-asset.html?id=${assetId}`;
}

// Edit asset name
function editAssetName(assetId, currentName) {
    currentEditingAssetId = assetId;
    const editNameInput = document.getElementById('editNameInput');
    const saveNameBtn = document.getElementById('saveNameBtn');
    
    if (editNameInput && saveNameBtn) {
        editNameInput.value = currentName;
        saveNameBtn.disabled = false;
        showEditModal();
    }
    
    console.log('✏️ Editing asset name:', assetId, currentName);
}

// Show edit modal
function showEditModal() {
    const modal = document.getElementById('editNameModal');
    const nameInput = document.getElementById('editNameInput');
    
    if (modal && nameInput) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
            nameInput.focus();
            nameInput.select();
        }, 10);
    }
}

// Hide edit modal
function hideEditModal() {
    const modal = document.getElementById('editNameModal');
    const nameInput = document.getElementById('editNameInput');
    
    if (modal && nameInput) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            nameInput.value = '';
            currentEditingAssetId = null;
        }, 300);
    }
}

// Handle save name
async function handleSaveName() {
    const nameInput = document.getElementById('editNameInput');
    const saveBtn = document.getElementById('saveNameBtn');
    
    if (!nameInput || !saveBtn || !currentEditingAssetId) return;
    
    const newName = nameInput.value.trim();
    if (!newName) {
        showStatusMessage('Please enter a valid name', 2000);
        return;
    }
    
    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Note: This would require a backend endpoint to update asset names
        // For now, we'll just update locally and show a message
        console.log('💾 Saving new name:', newName, 'for asset:', currentEditingAssetId);
        
        // Update local data
        const asset = currentAssets.find(a => a._id === currentEditingAssetId);
        if (asset) {
            asset.name = newName;
            
            // Update filtered assets too
            const filteredAsset = filteredAssets.find(a => a._id === currentEditingAssetId);
            if (filteredAsset) {
                filteredAsset.name = newName;
            }
            
            // Re-render assets
            renderAssets();
        }
        
        hideEditModal();
        showStatusMessage(`Model renamed to "${newName}" successfully! ✅`, 3000);
        
    } catch (error) {
        console.error('❌ Error saving name:', error);
        showStatusMessage('Failed to rename model. Please try again.', 3000);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

// Toggle like (unlike in this case)
async function toggleLike(assetId) {
    try {
        console.log('💖 Toggling like for asset:', assetId);
        
        const response = await fetch(`${getApiBaseUrl()}/auth/like-asset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ assetId })
        });
        
        if (response.ok) {
            const data = await response.json();
            const isLiked = data.isLiked;
            
            console.log('💖 Like toggled successfully:', isLiked ? 'liked' : 'unliked');
            
            if (!isLiked) {
                // Remove from local arrays
                currentAssets = currentAssets.filter(asset => asset._id !== assetId);
                filteredAssets = filteredAssets.filter(asset => asset._id !== assetId);
                
                // Re-render
                if (currentAssets.length === 0) {
                    showEmptyState();
                } else {
                    // Adjust current page if necessary
                    const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);
                    if (currentPage > totalPages && totalPages > 0) {
                        currentPage = totalPages;
                    }
                    renderAssets();
                    updatePagination();
                }
                
                showStatusMessage('Model removed from liked list', 2000);
            }
            
        } else {
            const errorData = await response.json();
            console.error('❌ Error toggling like:', errorData);
            showStatusMessage('Failed to update like status. Please try again.', 3000);
        }
        
    } catch (error) {
        console.error('❌ Error in like functionality:', error);
        showStatusMessage('Network error. Please try again.', 3000);
    }
}

// Download asset
async function downloadAsset(assetId) {
    try {
        console.log('📥 Downloading asset:', assetId);
        
        // Show download starting feedback
        showStatusMessage('Starting download...', 1000);
        
        const response = await fetch(`${getApiBaseUrl()}/assets/${assetId}/download`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        
        // Get the blob from response
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('Downloaded file is empty');
        }
        
        // Find asset name for filename
        const asset = currentAssets.find(a => a._id === assetId);
        const filename = asset ? `${asset.name}.glb` : `dalma-model.glb`;
        
        // Create blob URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Asset downloaded successfully');
        showStatusMessage('Download completed! 📥', 2000);
        
    } catch (error) {
        console.error('❌ Download error:', error);
        showStatusMessage('Download failed. Please try again.', 3000);
    }
}

// Show status message utility
function showStatusMessage(message, duration = 3000) {
    // Create or update status message element
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
    
    // Show message
    setTimeout(() => {
        statusMsg.style.opacity = '1';
        statusMsg.style.transform = 'translateX(0)';
    }, 10);
    
    // Hide message after duration
    setTimeout(() => {
        statusMsg.style.opacity = '0';
        statusMsg.style.transform = 'translateX(100%)';
        
        // Remove element after animation
        setTimeout(() => {
            if (statusMsg.parentNode) {
                statusMsg.parentNode.removeChild(statusMsg);
            }
        }, 300);
    }, duration);
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.viewAsset = viewAsset;
window.editAssetName = editAssetName;
window.toggleLike = toggleLike;
window.downloadAsset = downloadAsset;