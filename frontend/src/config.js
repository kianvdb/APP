// config.js - Centralized configuration with enhanced HTTPS handling
(function() {
    'use strict';
    
    // Determine if we're in development or production
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('localhost');
    
    // Determine protocol based on current page
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Helper function to get proper API URL
    const getApiBaseUrl = () => {
        if (isDevelopment) {
            return `http://${hostname}:3000/api`;
        } else {
            // In production on Render
            if (protocol === 'https:') {
                // For HTTPS pages, use HTTPS API without port
                return `https://${hostname}/api`;
            } else {
                // For HTTP pages, use HTTP with port
                return `http://${hostname}:3000/api`;
            }
        }
    };
    
    // Configuration object
    const config = {
        // API Base URL with proper protocol handling
        API_BASE_URL: getApiBaseUrl(),
        
        // Frontend URLs
        FRONTEND_URL: isDevelopment
            ? `http://${hostname}:5173`
            : `${protocol}//${hostname}`,
        
        // Static file paths
        STATIC_PATH: '/frontend',
        
        // Model paths
        MODEL_PATH: '/frontend/models',
        
        // Image paths
        IMAGE_PATH: '/frontend/public',
        
        // Environment flags
        isDevelopment: isDevelopment,
        isProduction: !isDevelopment,
        
        // Debug mode
        debug: isDevelopment,
        
        // CORS allowed origins
        allowedOrigins: [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://image-to-3d.onrender.com',
            'http://image-to-3d.onrender.com',
        ],
        
        // Helper function to get full API URL
        getApiUrl: function(endpoint) {
            return `${this.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        },
        
        // Helper function to get proxy URL for model generation
        getProxyUrl: function() {
            if (isDevelopment) {
                return `http://${hostname}:3000`;
            } else {
                // In production, use the appropriate protocol
                return protocol === 'https:' 
                    ? `https://${hostname}`
                    : `http://${hostname}:3000`;
            }
        },
        
        // Helper function to get static file URL
        getStaticUrl: function(path) {
            return `${this.STATIC_PATH}${path.startsWith('/') ? '' : '/'}${path}`;
        },
        
        // Helper function to get model URL
        getModelUrl: function(filename) {
            return `${this.MODEL_PATH}${filename.startsWith('/') ? '' : '/'}${filename}`;
        },
        
        // Helper function to get image URL
        getImageUrl: function(filename) {
            return `${this.IMAGE_PATH}${filename.startsWith('/') ? '' : '/'}${filename}`;
        }
    };
    
    // Log configuration in development
    if (config.debug || protocol === 'https:') {
        console.log('🔧 Configuration loaded:', {
            environment: isDevelopment ? 'development' : 'production',
            protocol: protocol,
            hostname: hostname,
            API_BASE_URL: config.API_BASE_URL,
            PROXY_URL: config.getProxyUrl(),
            FRONTEND_URL: config.FRONTEND_URL
        });
    }
    
    // Make config globally available
    window.APP_CONFIG = config;
    
    // Also expose as DALMA_CONFIG for compatibility
    window.DALMA_CONFIG = {
        API_BASE_URL: config.API_BASE_URL
    };
    
})();