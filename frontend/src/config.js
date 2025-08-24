// config.js - Centralized configuration for the app with Stripe
(function() {
    'use strict';
    
  const getAPIBaseURL = () => {
    // Check if running in Capacitor (mobile app)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // ALWAYS use your production URL for Capacitor
        console.log('📱 CAPACITOR DETECTED - Using production URL');
        return 'https://image-to-3d.onrender.com/api';
    }
    
    // Web browser (development or production)
    const hostname = window.location.hostname;
    const isDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isDevelopment) {
        console.log('💻 Web Development - Using localhost');
        return 'http://localhost:3000/api';
    } else {
        console.log('🌐 Production - Using current hostname');
        return `${window.location.protocol}//${hostname}/api`;
    }
};
    
    // Function to determine which Stripe key to use
    const getStripePublicKey = () => {
        const hostname = window.location.hostname;
        const isDevelopment = hostname === 'localhost' || 
                            hostname === '127.0.0.1' || 
                            hostname.includes('10.0.2.2');
        
        if (isDevelopment) {
            // TEST KEY - Replace with your actual test key from Stripe Dashboard
            return 'pk_test_51RywsWRvMEG1D62RhurF4sS9iF8QQlnNxYlvwCiQvboIBNa1Ka50YW4imWLe4ac0DQ9iRjS9Koq1npM3U80PULBJ00AXgPrL4Y';
        } else {
            // LIVE KEY - Replace with your actual live key when ready for production
            // IMPORTANT: Only use live key when you're ready to accept real payments
            return 'pk_live_YOUR_LIVE_STRIPE_KEY_HERE';
        }
    };
    
    // Main configuration object
    const config = {
        // API Configuration
        API_BASE_URL: getAPIBaseURL(),
        
        // Stripe Configuration
        STRIPE_PUBLIC_KEY: getStripePublicKey(),
        
        // Pricing Configuration (matching backend)
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
        },
        
        // New helper for payment endpoints
        getPaymentUrl: function(endpoint) {
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
            return `${this.API_BASE_URL}/payment/${cleanEndpoint}`;
        }
    };
    
    // Make config globally available (multiple ways for compatibility)
    window.config = config;
    window.APP_CONFIG = config;
    window.DALMA_CONFIG = {
        API_BASE_URL: config.API_BASE_URL,
        STRIPE_PUBLIC_KEY: config.STRIPE_PUBLIC_KEY
    };
    
    // Enhanced authenticated request function with better error handling
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
            console.log('🔐 Including Bearer token in request');
        }
        
        // Handle body properly
        if (options.body) {
            defaultOptions.body = options.body;
        }
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            // Handle token expiration
            if (response.status === 401) {
                console.log('⚠️ Token expired or invalid');
                // Clear stored token
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('user');
                
                // Dispatch auth state change event
                window.dispatchEvent(new CustomEvent('authStateChange', { 
                    detail: { authenticated: false } 
                }));
                
                // Optionally redirect to login
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
    
    // Helper function to load Stripe
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
    
    // Log final configuration
    console.log('✅ Configuration loaded:', {
        API_BASE_URL: config.API_BASE_URL,
        STRIPE_MODE: config.isDevelopment ? 'TEST' : 'LIVE',
        STRIPE_KEY: config.STRIPE_PUBLIC_KEY ? '✅ Configured' : '❌ Missing',
        Platform: window.Capacitor ? window.Capacitor.getPlatform() : 'Web',
        Environment: config.isDevelopment ? 'Development' : 'Production'
    });
})();