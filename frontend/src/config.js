/**
 * Application Configuration
 * Centralized configuration for API endpoints, Stripe integration, and environment settings
 */
(function() {
    'use strict';
    
    /**
     * Determine the API base URL based on environment
     * @returns {string} The appropriate API base URL
     */
    const getAPIBaseURL = () => {
        // Check if running in Capacitor mobile app
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            console.log('📱 CAPACITOR DETECTED - Using production URL');
            return 'https://threely-ai.onrender.com/api';
        }
        
        // Determine environment for web browser
        const hostname = window.location.hostname;
        const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
        
        if (isDevelopment) {
            console.log('💻 Development environment detected');
            // Use production API for now
            return 'https://threely-ai.onrender.com/api';
            // Uncomment to use local backend when available
            // return 'http://localhost:3000/api';
        } else {
            console.log('🌐 Production - Using deployed server');
            return 'https://threely-ai.onrender.com/api';
        }
    };
    
    /**
     * Get the appropriate Stripe public key based on environment
     * @returns {string} Stripe public key for current environment
     */
    const getStripePublicKey = () => {
        const hostname = window.location.hostname;
        const isDevelopment = hostname === 'localhost' || 
                            hostname === '127.0.0.1' || 
                            hostname.includes('10.0.2.2');
        
        if (isDevelopment) {
            // Test key for development
            return 'pk_test_51RywsWRvMEG1D62RhurF4sS9iF8QQlnNxYlvwCiQvboIBNa1Ka50YW4imWLe4ac0DQ9iRjS9Koq1npM3U80PULBJ00AXgPrL4Y';
        } else {
            // Production key placeholder
            return 'pk_live_YOUR_LIVE_STRIPE_KEY_HERE';
        }
    };
    
    /**
     * Main configuration object
     */
    const config = {
        // API Configuration
        API_BASE_URL: getAPIBaseURL(),
        
        // Stripe Configuration
        STRIPE_PUBLIC_KEY: getStripePublicKey(),
        
        // Pricing tiers matching backend configuration
        PRICING_TIERS: {
            starter: {
                id: 'starter',
                name: 'Starter Pack',
                tokens: 3,
                price: 2.99,
                currency: '€',
                description: 'Perfect for trying out'
            },
            popular: {
                id: 'popular',
                name: 'Popular Pack',
                tokens: 10,
                price: 7.99,
                currency: '€',
                description: 'Most popular choice',
                popular: true
            },
            pro: {
                id: 'pro',
                name: 'Professional',
                tokens: 25,
                price: 16.99,
                currency: '€',
                description: 'Best value per token'
            },
            studio: {
                id: 'studio',
                name: 'Studio Pack',
                tokens: 60,
                price: 34.99,
                currency: '€',
                description: 'For power users'
            }
        },
        
        // Static asset paths
        STATIC_PATH: '/frontend',
        MODEL_PATH: '/frontend/models',
        IMAGE_PATH: '/frontend/public',
        
        // Environment detection
        isDevelopment: window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1',
        
        /**
         * Get full API URL for an endpoint
         * @param {string} endpoint - API endpoint path
         * @returns {string} Full API URL
         */
        getApiUrl: function(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
            return this.API_BASE_URL + cleanEndpoint;
        },
        
        /**
         * Get full URL for a 3D model file
         * @param {string} filename - Model filename
         * @returns {string} Full model URL
         */
        getModelUrl: function(filename) {
            const cleanFilename = filename.startsWith('/') ? filename : '/' + filename;
            return this.MODEL_PATH + cleanFilename;
        },
        
        /**
         * Get full URL for an image file
         * @param {string} filename - Image filename
         * @returns {string} Full image URL
         */
        getImageUrl: function(filename) {
            const cleanFilename = filename.startsWith('/') ? filename : '/' + filename;
            return this.IMAGE_PATH + cleanFilename;
        },
        
        /**
         * Get full URL for payment endpoints
         * @param {string} endpoint - Payment endpoint path
         * @returns {string} Full payment API URL
         */
        getPaymentUrl: function(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
            return `${this.API_BASE_URL}/payment/${cleanEndpoint}`;
        }
    };
    
    // Expose configuration globally for compatibility
    window.config = config;
    window.APP_CONFIG = config;
    window.DALMA_CONFIG = {
        API_BASE_URL: config.API_BASE_URL,
        STRIPE_PUBLIC_KEY: config.STRIPE_PUBLIC_KEY
    };
    
    /**
     * Make authenticated API request with proper headers
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
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
        
        // Include auth token if available
        if (authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
            console.log('🔐 Including Bearer token in request');
        }
        
        // Handle request body
        if (options.body) {
            defaultOptions.body = options.body;
        }
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            // Handle authentication errors
            if (response.status === 401) {
                console.log('⚠️ Token expired or invalid');
                
                // Clear authentication data
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('user');
                
                // Dispatch auth state change event
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                    detail: { authenticated: false } 
                }));
                
                // Show login modal if auth manager is available
                if (window.authManager) {
                    window.authManager.showLoginModal();
                }
            }
            
            return response;
        } catch (error) {
            console.error('❌ Request failed:', error);
            throw error;
        }
    };
    
    /**
     * Load Stripe.js library dynamically
     * @returns {Promise<Stripe>} Initialized Stripe instance
     */
    window.loadStripe = async () => {
        if (window.Stripe) {
            console.log('✅ Stripe already loaded');
            return window.Stripe(config.STRIPE_PUBLIC_KEY);
        }
        
        // Load Stripe script dynamically
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                console.log('✅ Stripe loaded successfully');
                resolve(window.Stripe(config.STRIPE_PUBLIC_KEY));
            };
            script.onerror = () => {
                console.error('❌ Failed to load Stripe');
                reject(new Error('Failed to load Stripe'));
            };
            document.head.appendChild(script);
        });
    };
    
    // Log configuration status
    console.log('✅ Configuration loaded:', {
        API_BASE_URL: config.API_BASE_URL,
        STRIPE_MODE: config.isDevelopment ? 'TEST' : 'LIVE',
        STRIPE_KEY: config.STRIPE_PUBLIC_KEY ? '✅ Configured' : '❌ Missing',
        Platform: window.Capacitor ? window.Capacitor.getPlatform() : 'Web',
        Environment: config.isDevelopment ? 'Development' : 'Production'
    });
})();