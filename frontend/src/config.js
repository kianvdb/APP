// config.js - Centralized configuration for the app
(function() {
    'use strict';
    
    // Function to determine the correct API base URL
    const getAPIBaseURL = () => {
    // Check if running in Capacitor (mobile app)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Android emulator/device
        if (window.Capacitor.getPlatform() === 'android') {
            console.log('🚨 ANDROID DETECTED - Using 10.0.2.2 with HTTP');
            return 'http://10.0.2.2:3000/api';
        }
        // iOS simulator/device
        if (window.Capacitor.getPlatform() === 'ios') {
            console.log('📱 iOS DETECTED - Using localhost with HTTP');
            return 'http://localhost:3000/api';
        }
    }
    
    // Web browser (development or production)
    const hostname = window.location.hostname;
    const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isDevelopment) {
        console.log('💻 Web Development - Using localhost with HTTP'); // Changed to HTTP
        return 'http://localhost:3000/api';
    } else {
        console.log('🌐 Production - Using current hostname');
        return `${window.location.protocol}//${hostname}/api`;
    }
};
    // Main configuration object
    const config = {
        // API Configuration
        API_BASE_URL: getAPIBaseURL(),
        // Frontend paths
        STATIC_PATH: '/frontend',
        MODEL_PATH: '/frontend/models',
        IMAGE_PATH: '/frontend/public',
        
        // Environment detection
        isDevelopment: window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1',
        
        // Helper functions
        getApiUrl: function(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
            return this.API_BASE_URL + cleanEndpoint;
        },
        
        getModelUrl: function(filename) {
            const cleanFilename = filename.startsWith('/') ? filename : '/' + filename;
            return this.MODEL_PATH + cleanFilename;
        },
        
        getImageUrl: function(filename) {
            const cleanFilename = filename.startsWith('/') ? filename : '/' + filename;
            return this.IMAGE_PATH + cleanFilename;
        }
    };
    
    // Make config globally available (multiple ways for compatibility)
    window.config = config;
    window.APP_CONFIG = config;
    window.DALMA_CONFIG = {
        API_BASE_URL: config.API_BASE_URL
    };
   window.makeAuthenticatedRequest = async (url, options = {}) => {
    const authToken = localStorage.getItem('authToken');
    
    const defaultOptions = {
        method: options.method || 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        }
    };
    
    // ALWAYS add auth token if available (for both Capacitor and web)
    if (authToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔑 Including Bearer token in request');
    }
    
    // Handle body properly
    if (options.body) {
        defaultOptions.body = options.body;
    }
    
    return fetch(url, { ...defaultOptions, ...options });
};
    
    // Log final configuration
    console.log('✅ Configuration loaded:', {
        API_BASE_URL: config.API_BASE_URL,
        Platform: window.Capacitor ? window.Capacitor.getPlatform() : 'Web',
        Environment: config.isDevelopment ? 'Development' : 'Production'
    });
})();