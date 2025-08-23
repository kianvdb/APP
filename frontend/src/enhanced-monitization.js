// enhanced-monetization.js - Complete Token Management & Pricing System
// Replace the existing monetization.js with this enhanced version

class EnhancedMonetization {
    constructor() {
        // Token management
        this.userTokens = 0;
        this.userId = null;
        this.isAdmin = false;
        
        // OPTIMIZED PRICING TIERS
        // Based on €0.18 cost per generation
        // Target profit margin: 70-85%
        this.pricingTiers = [
            {
                id: 'starter',
                name: 'Starter Pack',
                tokens: 3,
                price: 2.99,
                currency: '€',
                popular: false,
                savings: null,
                perToken: 1.00,
                features: ['3 3D generations', 'Standard quality', 'All export formats']
            },
            {
                id: 'popular',
                name: 'Popular Pack',
                tokens: 10,
                price: 7.99,
                currency: '€',
                popular: true,
                savings: '20% off',
                perToken: 0.80,
                features: ['10 3D generations', 'High quality', 'All export formats', 'Priority processing']
            },
            {
                id: 'pro',
                name: 'Professional',
                tokens: 25,
                price: 16.99,
                currency: '€',
                popular: false,
                savings: '32% off',
                perToken: 0.68,
                features: ['25 3D generations', 'Maximum quality', 'Priority support', 'Commercial license']
            },
            {
                id: 'studio',
                name: 'Studio Pack',
                tokens: 60,
                price: 34.99,
                currency: '€',
                popular: false,
                savings: '42% off',
                perToken: 0.58,
                features: ['60 3D generations', 'Bulk processing', 'Dedicated support', 'Team collaboration']
            }
        ];
        
        // Transaction history
        this.transactions = [];
        
        // Initialize
        this.init();
    }

    async init() {
    console.log('💎 Enhanced Monetization System Initializing...');
    
    // Load user data
    await this.loadUserData();
    
    // Check admin status
    this.checkAdminStatus();
    
    // Setup UI
    this.setupPricingModal();
    this.updateTokensDisplay();
    this.setupEventListeners();
    
    // CRITICAL: Setup token listeners
    this.setupTokenListeners();
    
    // Initialize payment provider
    this.initializePaymentProvider();
    
    console.log('✅ Monetization ready');
}

   async fetchUserData() {
    // Check authentication  
    if (!window.authManager?.isAuthenticated()) {
        return null;
    }

    try {
        // Get user data from auth manager first
        const currentUser = window.authManager?.getUser();
        if (currentUser) {
            console.log('💰 Loading tokens from auth manager:', currentUser.tokens);
            return {
                id: currentUser.id,
                tokens: currentUser.tokens || 1,  // Default to 1 if undefined
                role: currentUser.isAdmin ? 'admin' : 'user',
                transactions: currentUser.transactions || []
            };
        }
        
        // Fallback to API call if needed
        const response = await window.makeAuthenticatedRequest(
            `${this.getApiBaseUrl()}/auth/me`,
            { method: 'GET' }
        );
        
        if (response.ok) {
            const data = await response.json();
            console.log('💰 Loaded tokens from API:', data.user.tokens);
            
            // CRITICAL: Update auth manager with fresh data
            if (window.authManager && window.authManager.user) {
                window.authManager.user.tokens = data.user.tokens || 1;
                window.authManager.currentUser.tokens = data.user.tokens || 1;
            }
            
            return {
                id: data.user.id,
                tokens: data.user.tokens || 1,
                role: data.user.isAdmin ? 'admin' : 'user',
                transactions: data.user.transactions || []
            };
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
    return null;
}
// Update the loadUserData method:
async loadUserData() {
    try {
        // Check if user is authenticated
        const userData = await this.fetchUserData();
        if (userData) {
            this.userId = userData.id;
            this.userTokens = userData.tokens || 1;  // Default to 1 if undefined
            this.isAdmin = userData.role === 'admin';
            this.transactions = userData.transactions || [];
            
            console.log('📊 Tokens loaded:', this.userTokens);
            
            // Update displays immediately after loading
            this.updateTokensDisplay();
            
            // Also update in AppNavigation if it exists
            if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
                window.AppNavigation.updateAccountStats(userData);
            }
        } else {
            // Load from local storage for non-authenticated users
            this.loadLocalTokens();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        this.loadLocalTokens();
    }
}
    loadLocalTokens() {
        const savedTokens = localStorage.getItem('dalma_user_tokens');
        if (savedTokens !== null) {
            this.userTokens = parseInt(savedTokens, 10);
        } else {
            // First time user gets 1 free token
            this.userTokens = 1;
            this.saveLocalTokens();
        }
    }

    saveLocalTokens() {
        localStorage.setItem('dalma_user_tokens', this.userTokens.toString());
    }

    checkAdminStatus() {
        // Check if user is admin based on email or special flag
        const adminEmails = ['admin@threely.com', 'threely.service@gmail.com'];
        const userEmail = window.authManager?.currentUser?.email;
        
        if (adminEmails.includes(userEmail)) {
            this.isAdmin = true;
            this.userTokens = 999999; // Unlimited tokens for admin
            console.log('👑 Admin mode activated - Unlimited tokens');
        }
    }

    setupPricingModal() {
        // Remove existing modal if present
        const existingModal = document.querySelector('.enhanced-pricing-modal');
        if (existingModal) existingModal.remove();

        // Create enhanced modal
        const modal = document.createElement('div');
        modal.className = 'enhanced-pricing-modal';
        modal.innerHTML = this.generatePricingModalHTML();
        document.body.appendChild(modal);

        // Add styles
        this.injectStyles();
    }

    generatePricingModalHTML() {
        return `
            <div class="pricing-modal-overlay"></div>
            <div class="pricing-modal-content">
                <!-- Header -->
                <div class="pricing-header">
                    <div class="pricing-header-top">
                        <h2>Buy Tokens</h2>
                        <button class="pricing-close" id="pricingCloseBtn" style="background: rgba(255,255,255,0.1); border: none; color: rgba(255, 255, 255, 0.8); cursor: pointer; padding: 0; border-radius: 50%; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; min-width: 44px; min-height: 44px; touch-action: manipulation;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <p class="pricing-subtitle">Choose the perfect plan for your 3D creation needs</p>
                    
                    <!-- Current Balance -->
                    <div class="current-balance">
                        <span class="balance-label">Current Balance:</span>
                        <span class="balance-amount">${this.isAdmin ? '∞' : this.userTokens} tokens</span>
                    </div>
                </div>

                <!-- Tier Selection Section -->
                <div id="tierSelection">
                    <!-- Pricing Tiers -->
                    <div class="pricing-tiers">
                        ${this.pricingTiers.map(tier => this.generateTierCard(tier)).join('')}
                    </div>

                    <!-- Payment Methods -->
                    <div class="payment-methods">
                        <h3>Payment Method</h3>
                        <div class="payment-options">
                            <button class="payment-option active" data-method="card">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                                <span>Credit Card</span>
                            </button>
                            <button class="payment-option" data-method="paypal">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8.32 21.97a.546.546 0 0 1-.26-.32c-.03-.15-.06.11.6-8.42h2.45c.65 0 1.26-.1 1.76-.32 2.23-.98 2.85-3.56 1.85-5.64-.64-1.32-1.89-2.09-3.45-2.12H7.52c-.48 0-.85.38-.91.86L4.02 21.54c0 .16.01.31.09.44s.21.2.38.2h3.18l.65-4.21zm10.3-13.93c-.56-1.45-1.71-2.53-3.16-2.97-1.04-.32-2.13-.32-3.43-.32H6.75c-.72 0-1.28.58-1.38 1.3L2.02 23.46c0 .24.02.47.14.66.12.2.31.3.56.3h4.79l1.2-7.63 1.51.01c3.67 0 6.63-1.53 7.39-5.74.38-2.09-.13-3.88-1-5.02z"/>
                                </svg>
                                <span>PayPal</span>
                            </button>
                            <button class="payment-option" data-method="googlepay">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                                </svg>
                                <span>Google Pay</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card Input Section (Initially Hidden) -->
                <div class="card-input-section" id="cardInputSection" style="display: none;">
                    <h3 style="font-family: 'Sora', sans-serif; color: white; margin-bottom: 1rem;">Enter Card Details</h3>
                    <div class="card-details-form">
                        <div id="card-element" style="padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; margin-bottom: 0.5rem;"></div>
                        <div id="card-errors" style="color: #dc3545; font-size: 0.85rem; margin-bottom: 1rem; min-height: 20px;"></div>
                        <button id="confirm-payment-btn" class="confirm-payment-btn" style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #00bcd4, #00acc1); color: white; border: none; border-radius: 12px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                            Complete Payment
                        </button>
                        <button id="cancel-payment-btn" onclick="window.EnhancedMonetization.instance.cancelPayment()" style="width: 100%; padding: 0.8rem; background: transparent; color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; font-family: 'Sora', sans-serif; margin-top: 0.5rem; cursor: pointer;">
                            Cancel
                        </button>
                    </div>
                </div>

                <!-- Footer -->
                <div class="pricing-footer">
                    <p class="security-note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                        </svg>
                        Secure payment powered by Stripe
                    </p>
                </div>
            </div>
        `;
    }

    generateTierCard(tier) {
        const isPopular = tier.popular;
        const perTokenPrice = (tier.price / tier.tokens).toFixed(2);
        
        return `
            <div class="tier-card ${isPopular ? 'popular' : ''}" data-tier-id="${tier.id}">
                ${isPopular ? '<div class="popular-badge">MOST POPULAR</div>' : ''}
                ${tier.savings ? `<div class="savings-badge">${tier.savings}</div>` : ''}
                
                <div class="tier-header">
                    <h3 class="tier-name">${tier.name}</h3>
                    <div class="tier-tokens">
                        <span class="token-amount">${tier.tokens}</span>
                        <span class="token-label">tokens</span>
                    </div>
                </div>
                
                <div class="tier-pricing">
                    <span class="price-currency">${tier.currency}</span>
                    <span class="price-amount">${tier.price.toFixed(2)}</span>
                    <span class="price-per-token">${tier.currency}${perTokenPrice} per token</span>
                </div>
                
                <ul class="tier-features">
                    ${tier.features.map(feature => `
                        <li>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                            </svg>
                            <span>${feature}</span>
                        </li>
                    `).join('')}
                </ul>
                
                <button class="tier-buy-btn" data-tier-id="${tier.id}">
                    Select Plan
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Buy tokens button in header
        const buyBtn = document.getElementById('buyCreditsBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => this.showPricingModal());
        }

        // Modal close button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'pricingCloseBtn' || e.target.classList.contains('pricing-modal-overlay')) {
                this.hidePricingModal();
            }
        });

        // Tier selection
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tier-buy-btn')) {
                const tierId = e.target.dataset.tierId;
                this.selectTier(tierId);
            }
        });

        // Payment method selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.payment-option')) {
                const option = e.target.closest('.payment-option');
                document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            }
        });
    }

    showPricingModal() {
        const modal = document.querySelector('.enhanced-pricing-modal');
        if (modal) {
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }
    }

    hidePricingModal() {
        const modal = document.querySelector('.enhanced-pricing-modal');
        if (modal) {
            modal.classList.remove('visible');
            document.body.style.overflow = '';
        }
    }

    async selectTier(tierId) {
        const tier = this.pricingTiers.find(t => t.id === tierId);
        if (!tier) return;

        // Check authentication
        if (!window.authManager?.isAuthenticated()) {
            this.hidePricingModal();
            window.authManager?.showLoginModal();
            sessionStorage.setItem('pendingPurchase', JSON.stringify(tier));
            return;
        }

        // Get selected payment method
        const paymentMethod = document.querySelector('.payment-option.active')?.dataset.method || 'card';
        
        // Start purchase flow
        await this.processPurchase(tier, paymentMethod);
    }

    async processPurchase(tier, paymentMethod) {
        try {
            // Store current tier for later use
            this.currentTier = tier;
            
            // Show loading state
            this.showPurchaseLoading(tier);

            // Create payment intent on backend
            const response = await window.makeAuthenticatedRequest(
                `${this.getApiBaseUrl()}/payment/create-payment-intent`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        tierId: tier.id
                    })
                }
            );

            if (!response.ok) throw new Error('Failed to create payment intent');

            const { clientSecret, amount, tokens } = await response.json();
            
            // Store for confirmation
            this.currentPayment = { clientSecret, amount, tokens };

            // Handle payment based on method
            if (paymentMethod === 'card') {
                await this.showCardInput();
            } else if (paymentMethod === 'paypal') {
                // PayPal coming soon
                this.hidePricingModal();
                this.showComingSoon('PayPal');
            } else if (paymentMethod === 'googlepay') {
                // Google Pay works through Stripe
                await this.showCardInput();
            }

        } catch (error) {
            console.error('Purchase error:', error);
            this.showPurchaseError(error.message);
        }
    }

    async showCardInput() {
        // Hide loading overlay
        const loadingOverlay = document.querySelector('.purchase-loading-overlay');
        if (loadingOverlay) loadingOverlay.remove();
        
        // Hide tier cards and payment methods
        document.querySelector('.pricing-tiers').style.display = 'none';
        document.querySelector('.payment-methods').style.display = 'none';
        
        // Show card input section
        const cardSection = document.getElementById('cardInputSection');
        cardSection.style.display = 'block';
        
        // Update the card section title to English
        const cardTitle = cardSection.querySelector('h3');
        if (cardTitle) {
            cardTitle.textContent = 'Enter Card Details';
        }
        
        // Initialize Stripe Elements if not already done
        if (!this.stripe) {
            this.stripe = await window.loadStripe();
        }
        
        // Force English locale for Stripe Elements
        const elements = this.stripe.elements({
            locale: 'en'  // Force English language
        });
        
        // Create separate elements for better control
        const elementStyles = {
            base: {
                color: '#ffffff',
                fontFamily: '"Sora", sans-serif',
                fontSize: '16px',
                '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.6)'
                },
                lineHeight: '24px',
                fontSmoothing: 'antialiased'
            },
            invalid: {
                color: '#ff5252',
                iconColor: '#ff5252'
            },
            complete: {
                color: '#4caf50'
            }
        };
        
        // Clear the card element container and create structured form
        const cardElementDiv = document.getElementById('card-element');
        cardElementDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div id="cardNumber" style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;"></div>
                <div style="display: flex; gap: 12px;">
                    <div id="cardExpiry" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;"></div>
                    <div id="cardCvc" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;"></div>
                </div>
                <input 
                    id="postalCode" 
                    type="text" 
                    placeholder="Postal Code" 
                    style="padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; font-family: 'Sora', sans-serif; font-size: 16px; outline: none; transition: border-color 0.15s ease;"
                    autocomplete="postal-code"
                    onfocus="this.style.borderColor='rgba(255,255,255,0.3)'"
                    onblur="this.style.borderColor='rgba(255,255,255,0.2)'"
                />
            </div>
        `;
        
        // Create individual Stripe elements (without postal code)
        this.cardNumber = elements.create('cardNumber', {
            style: elementStyles,
            placeholder: 'Card Number'
        });
        this.cardExpiry = elements.create('cardExpiry', {
            style: elementStyles,
            placeholder: 'MM / YY'
        });
        this.cardCvc = elements.create('cardCvc', {
            style: elementStyles,
            placeholder: 'CVC'
        });
        
        // Mount the elements
        this.cardNumber.mount('#cardNumber');
        this.cardExpiry.mount('#cardExpiry');
        this.cardCvc.mount('#cardCvc');
        
        // Track completion state
        let cardComplete = {
            cardNumber: false,
            cardExpiry: false,
            cardCvc: false
        };
        
        // Handle validation for each element
        const handleCardChange = (elementName) => (event) => {
            const displayError = document.getElementById('card-errors');
            
            if (event.error) {
                let errorMessage = event.error.message;
                
                // Translate Dutch errors
                const translations = {
                    'Het nummer van je kaart is onvolledig.': 'Your card number is incomplete.',
                    'De vervaldatum van je kaart is onvolledig.': 'Your card\'s expiration date is incomplete.',
                    'De beveiligingscode van je kaart is onvolledig.': 'Your card\'s security code is incomplete.',
                    'Je kaartnummer is ongeldig.': 'Your card number is invalid.',
                    'De vervaldatum van je kaart is in het verleden.': 'Your card\'s expiration date is in the past.'
                };
                
                for (const [dutch, english] of Object.entries(translations)) {
                    if (errorMessage.includes(dutch)) {
                        errorMessage = english;
                        break;
                    }
                }
                
                displayError.textContent = errorMessage;
                displayError.style.display = 'block';
                cardComplete[elementName] = false;
            } else {
                displayError.textContent = '';
                displayError.style.display = 'none';
                cardComplete[elementName] = event.complete;
            }
            
            // Check if all fields are complete
            const postalCode = document.getElementById('postalCode').value;
            const allComplete = cardComplete.cardNumber && cardComplete.cardExpiry && cardComplete.cardCvc && postalCode.length >= 3;
            
            const confirmBtn = document.getElementById('confirm-payment-btn');
            if (allComplete) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.6';
                confirmBtn.style.cursor = 'not-allowed';
            }
        };
        
        // Add change listeners to Stripe elements
        this.cardNumber.on('change', handleCardChange('cardNumber'));
        this.cardExpiry.on('change', handleCardChange('cardExpiry'));
        this.cardCvc.on('change', handleCardChange('cardCvc'));
        
        // Handle postal code input
        const postalInput = document.getElementById('postalCode');
        postalInput.addEventListener('input', () => {
            const postalCode = postalInput.value;
            const allComplete = cardComplete.cardNumber && cardComplete.cardExpiry && cardComplete.cardCvc && postalCode.length >= 3;
            
            const confirmBtn = document.getElementById('confirm-payment-btn');
            if (allComplete) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.6';
                confirmBtn.style.cursor = 'not-allowed';
            }
        });
        
        // Setup confirm button
        const confirmBtn = document.getElementById('confirm-payment-btn');
        confirmBtn.textContent = 'Complete Payment';
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.6';
        confirmBtn.onclick = () => this.confirmCardPayment();
    }

    // FIX for enhanced-monetization.js - Update the confirmCardPayment method

async confirmCardPayment() {
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const cardErrors = document.getElementById('card-errors');
    
    if (confirmBtn.disabled) {
        cardErrors.textContent = 'Please complete all card fields';
        return;
    }
    
    const postalCode = document.getElementById('postalCode').value;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5rem;"></span>Processing...';
    
    try {
        cardErrors.textContent = '';
        cardErrors.style.display = 'none';
        
        const { error: methodError, paymentMethod } = await this.stripe.createPaymentMethod({
            type: 'card',
            card: this.cardNumber,
            billing_details: {
                email: window.authManager?.currentUser?.email || 'user@example.com',
                address: {
                    postal_code: postalCode
                }
            }
        });
        
        if (methodError) {
            throw methodError;
        }
        
        const { error, paymentIntent } = await this.stripe.confirmCardPayment(
            this.currentPayment.clientSecret,
            {
                payment_method: paymentMethod.id
            }
        );
        
        if (error) {
            throw new Error(error.message);
        } else if (paymentIntent.status === 'succeeded') {
            console.log('✅ Payment succeeded:', paymentIntent.id);
            
            // Update tokens immediately
            const oldBalance = this.userTokens;
            const purchasedTokens = this.currentTier.tokens;
            this.userTokens = oldBalance + purchasedTokens;
            
            console.log(`💰 Tokens updated: ${oldBalance} + ${purchasedTokens} = ${this.userTokens}`);
            
            // CRITICAL: Update auth manager IMMEDIATELY
            if (window.authManager) {
                if (window.authManager.user) {
                    window.authManager.user.tokens = this.userTokens;
                }
                if (window.authManager.currentUser) {
                    window.authManager.currentUser.tokens = this.userTokens;
                }
            }
            
            // Force update ALL displays
            this.forceUpdateAllTokenDisplays();
            
            // Show success modal
            this.showPurchaseSuccess(this.currentTier);
            
            // Hide modal and reset form
            this.hidePricingModal();
            this.resetCardForm();
            
            // Clear current payment data
            this.currentPayment = null;
            this.currentTier = null;
            
            // Verify with backend after a delay
            setTimeout(() => this.verifyPaymentAndUpdateTokens(paymentIntent.id), 500);
        }
    } catch (error) {
        console.error('Payment confirmation error:', error);
        cardErrors.textContent = error.message || 'Payment failed. Please try again.';
        cardErrors.style.display = 'block';
        cardErrors.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Complete Payment';
    }
}
// In enhanced-monitization.js, update syncTokensFromBackend:
async syncTokensFromBackend() {
    try {
        console.log('🔍 Syncing tokens from backend...');
        
        const response = await window.makeAuthenticatedRequest(
            `${this.getApiBaseUrl()}/payment/user-tokens`,
            { method: 'GET' }
        );
        
        if (response.ok) {
            const data = await response.json();
            console.log('📦 Backend response:', data);
            
            this.userTokens = data.tokens || 1;
            this.userId = data.id;
            this.isAdmin = data.isAdmin || false;
            
            console.log('🔄 Synced tokens from backend:', this.userTokens);
            
            // Update auth manager
            if (window.authManager) {
                if (window.authManager.user) {
                    window.authManager.user.tokens = this.userTokens;
                }
                if (window.authManager.currentUser) {
                    window.authManager.currentUser.tokens = this.userTokens;
                }
            }
            
            // Force update all displays
            this.forceUpdateAllTokenDisplays();
            
            return this.userTokens;
        } else {
            console.error('❌ Failed to sync tokens, response not ok:', response.status);
        }
    } catch (error) {
        console.error('❌ Error syncing tokens from backend:', error);
    }
    return this.userTokens;
}

// FIX 5: Add periodic sync (call this in init)
startPeriodicSync() {
    // Sync every 30 seconds if authenticated
    setInterval(() => {
        if (window.authManager?.isAuthenticated()) {
            this.syncTokensFromBackend();
        }
    }, 30000);
}

forceUpdateAllTokenDisplays() {
    console.log('🔄 Force updating all token displays to:', this.userTokens);
    
    // Update header display
    const creditsCount = document.getElementById('creditsCount');
    if (creditsCount) {
        creditsCount.textContent = this.isAdmin ? '∞' : this.userTokens;
        console.log('✅ Updated header credits to:', this.userTokens);
    }

    // Update account section credits with multiple selectors
    const accountCredits = document.getElementById('accountCreditsCount');
    if (accountCredits) {
        accountCredits.textContent = this.isAdmin ? '∞' : this.userTokens;
        console.log('✅ Updated account credits to:', this.userTokens);
    }
    
    // Also try alternative selector for account section
    const accountCreditsAlt = document.querySelector('#accountSection .stat-card div[style*="font-size: 2rem"]');
    if (accountCreditsAlt && accountCreditsAlt.id === 'accountCreditsCount') {
        accountCreditsAlt.textContent = this.isAdmin ? '∞' : this.userTokens;
    }

    // Update modal balance if it's open
    const balanceAmount = document.querySelector('.balance-amount');
    if (balanceAmount) {
        balanceAmount.textContent = `${this.isAdmin ? '∞' : this.userTokens} tokens`;
        console.log('✅ Updated modal balance to:', this.userTokens);
    }
    
    // Update current balance in the Buy Tokens modal
    const currentBalance = document.querySelector('.current-balance .balance-amount');
    if (currentBalance) {
        currentBalance.textContent = `${this.isAdmin ? '∞' : this.userTokens} tokens`;
    }

    // Update visual state
    this.updateCreditsVisualState();
    
    // Save to local storage
    if (!this.isAdmin) {
        this.saveLocalTokens();
    }
    
    // CRITICAL: Sync with auth manager
    if (window.authManager) {
        if (window.authManager.user) {
            window.authManager.user.tokens = this.userTokens;
        }
        if (window.authManager.currentUser) {
            window.authManager.currentUser.tokens = this.userTokens;
        }
        console.log('✅ Updated auth manager tokens:', this.userTokens);
    }
    
    // CRITICAL: Force update AppNavigation
    if (window.AppNavigation) {
        // Call updateAccountStats with updated user data
        const updatedUser = {
            tokens: this.userTokens,
            isAdmin: this.isAdmin,
            email: window.authManager?.currentUser?.email || 'User'
        };
        
        if (window.AppNavigation.updateAccountStats) {
            window.AppNavigation.updateAccountStats(updatedUser);
            console.log('✅ Force updated AppNavigation with tokens:', this.userTokens);
        }
        
        // Also update the account credits directly
        const accountCreditsInNav = document.querySelector('#accountCreditsCount');
        if (accountCreditsInNav) {
            accountCreditsInNav.textContent = this.isAdmin ? '∞' : this.userTokens;
        }
    }
    
    // Dispatch custom event for any other listeners
    window.dispatchEvent(new CustomEvent('tokensUpdated', {
        detail: { tokens: this.userTokens }
    }));
}

async verifyPaymentAndUpdateTokens(paymentIntentId) {
    try {
        console.log('🔍 Verifying payment with backend:', paymentIntentId);
        console.log('🔍 Sending tokens:', this.currentTier?.tokens);
        
        const response = await window.makeAuthenticatedRequest(
            `${this.getApiBaseUrl()}/payment/confirm-payment`,
            {
                method: 'POST',
                body: JSON.stringify({
                    paymentIntentId: paymentIntentId,
                    tokens: this.currentTier?.tokens || this.currentPayment?.tokens
                })
            }
        );
        
        console.log('📦 Backend response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error response:', errorText);
            throw new Error('Failed to verify payment');
        }
        
        const result = await response.json();
        console.log('✅ Backend confirmed payment:', result);
        
        // Update local tokens with backend value
        this.userTokens = result.newBalance || result.tokens || this.userTokens;
        
        console.log('🔄 Backend confirmed tokens:', this.userTokens);
        
        // Update auth manager
        if (window.authManager) {
            if (window.authManager.user) {
                window.authManager.user.tokens = this.userTokens;
            }
            if (window.authManager.currentUser) {
                window.authManager.currentUser.tokens = this.userTokens;
            }
        }
        
        // Force update all UI elements with backend-confirmed value
        this.forceUpdateAllTokenDisplays();
        
        // Clear current payment data
        this.currentPayment = null;
        this.currentTier = null;
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        // Still update the display with local calculation
        this.forceUpdateAllTokenDisplays();
        
        // Refresh token balance after a delay (webhook processing)
        setTimeout(() => this.refreshTokenBalance(), 2000);
    }
}
// UPDATE the refreshTokenBalance method
async refreshTokenBalance() {
    try {
        const response = await window.makeAuthenticatedRequest(
            `${this.getApiBaseUrl()}/auth/me`  // Use /auth/me to get full user data
        );
        
        if (response.ok) {
            const data = await response.json();
            this.userTokens = data.user.tokens || this.userTokens;
            
            console.log('🔄 Refreshed token balance from backend:', this.userTokens);
            
            // Force update all displays
            this.forceUpdateAllTokenDisplays();
        }
    } catch (error) {
        console.error('Error refreshing token balance:', error);
    }
}

// ALSO ADD this listener to handle token updates from other sources
// Add this in the constructor or init method of EnhancedMonetization class:
setupTokenListeners() {
    // Listen for custom token update events
    window.addEventListener('tokensUpdated', (event) => {
        if (event.detail.tokens !== undefined && event.detail.tokens !== this.userTokens) {
            this.userTokens = event.detail.tokens;
            this.forceUpdateAllTokenDisplays();
        }
    });
    
    // Listen for auth state changes
    window.addEventListener('authStateChange', (event) => {
        if (event.detail.authenticated && event.detail.user && event.detail.user.tokens !== undefined) {
            this.userTokens = event.detail.user.tokens;
            this.userId = event.detail.user.id;
            this.isAdmin = event.detail.user.isAdmin;
            this.forceUpdateAllTokenDisplays();
        }
    });
}

    resetCardForm() {
        // Reset card form to initial state
        const cardSection = document.getElementById('cardInputSection');
        if (cardSection) cardSection.style.display = 'none';
        
        // Show tier cards and payment methods again
        const tiers = document.querySelector('.pricing-tiers');
        const methods = document.querySelector('.payment-methods');
        if (tiers) tiers.style.display = 'grid';
        if (methods) methods.style.display = 'block';
        
        // Clear card elements if they exist
        if (this.cardNumber) {
            this.cardNumber.clear();
        }
        if (this.cardExpiry) {
            this.cardExpiry.clear();
        }
        if (this.cardCvc) {
            this.cardCvc.clear();
        }
        
        // Clear postal code input
        const postalInput = document.getElementById('postalCode');
        if (postalInput) {
            postalInput.value = '';
        }
        
        // Clear any errors
        const cardErrors = document.getElementById('card-errors');
        if (cardErrors) cardErrors.textContent = '';
    }

    cancelPayment() {
        this.resetCardForm();
        // Remove any loading overlays
        const loadingOverlay = document.querySelector('.purchase-loading-overlay');
        if (loadingOverlay) loadingOverlay.remove();
    }

    async saveTokensToBackend(tokens) {
        if (!window.authManager?.isAuthenticated()) {
            this.saveLocalTokens();
            return;
        }

        try {
            await window.makeAuthenticatedRequest(
                `${this.getApiBaseUrl()}/auth/update-tokens`,
                {
                    method: 'POST',
                    body: JSON.stringify({ tokens })
                }
            );
        } catch (error) {
            console.error('Error saving tokens:', error);
            this.saveLocalTokens();
        }
    }

    updateTokensDisplay() {
        console.log('💰 Updating token display to:', this.userTokens);
        
        // Update header display
        const creditsCount = document.getElementById('creditsCount');
        if (creditsCount) {
            creditsCount.textContent = this.isAdmin ? '∞' : this.userTokens;
            console.log('✅ Updated header credits to:', this.userTokens);
        }

        // Update account section credits
        const accountCredits = document.getElementById('accountCreditsCount');
        if (accountCredits) {
            accountCredits.textContent = this.isAdmin ? '∞' : this.userTokens;
            console.log('✅ Updated account credits to:', this.userTokens);
        }

        // Update modal balance if it's open
        const balanceAmount = document.querySelector('.balance-amount');
        if (balanceAmount) {
            balanceAmount.textContent = `${this.isAdmin ? '∞' : this.userTokens} tokens`;
            console.log('✅ Updated modal balance to:', this.userTokens);
        }
        
        // Update current balance in the Buy Tokens modal
        const currentBalance = document.querySelector('.current-balance .balance-amount');
        if (currentBalance) {
            currentBalance.textContent = `${this.isAdmin ? '∞' : this.userTokens} tokens`;
        }

        // Update visual state
        this.updateCreditsVisualState();
        
        // Save to local storage
        if (!this.isAdmin) {
            this.saveLocalTokens();
        }
        
        // Also update app navigation if it exists
        if (window.AppNavigation && window.AppNavigation.updateAccountStats) {
            window.AppNavigation.updateAccountStats();
        }
    }

    updateCreditsVisualState() {
        const creditsContainer = document.getElementById('creditsContainer');
        if (!creditsContainer) return;

        creditsContainer.classList.remove('low-credits', 'no-credits', 'unlimited');
        
        if (this.isAdmin) {
            creditsContainer.classList.add('unlimited');
        } else if (this.userTokens === 0) {
            creditsContainer.classList.add('no-credits');
        } else if (this.userTokens <= 3) {
            creditsContainer.classList.add('low-credits');
        }
    }

    // Token consumption methods
    consumeToken() {
        if (this.isAdmin) return true; // Admin has unlimited tokens
        
        if (this.userTokens > 0) {
            this.userTokens--;
            this.saveTokensToBackend(this.userTokens);
            this.updateTokensDisplay();
            return true;
        }
        
        // Show insufficient tokens modal
        this.showInsufficientTokensModal();
        return false;
    }

    hasTokens() {
        return this.isAdmin || this.userTokens > 0;
    }

    getTokenBalance() {
        return this.isAdmin ? Infinity : this.userTokens;
    }

    // UI feedback methods
    showPurchaseLoading(tier) {
        const modal = document.querySelector('.pricing-modal-content');
        if (!modal) return;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'purchase-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="purchase-loading">
                <div class="loading-spinner"></div>
                <h3>Processing Payment</h3>
                <p>Purchasing ${tier.tokens} tokens for ${tier.currency}${tier.price.toFixed(2)}</p>
                <p class="loading-status">Please wait...</p>
            </div>
        `;
        modal.appendChild(loadingOverlay);
    }

    showPurchaseSuccess(tier) {
        // Remove any existing success modal
        const existingModal = document.querySelector('.purchase-success-modal');
        if (existingModal) existingModal.remove();
        
        const successModal = document.createElement('div');
        successModal.className = 'purchase-success-modal';
        successModal.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✨</div>
                <h2>Purchase Successful!</h2>
                <p>${tier.tokens} tokens have been added to your account</p>
                <div class="success-balance">
                    New Balance: <strong>${this.userTokens} tokens</strong>
                </div>
                <button class="success-btn" onclick="this.closest('.purchase-success-modal').remove()">
                    Start Creating
                </button>
            </div>
        `;
        document.body.appendChild(successModal);
        
        setTimeout(() => {
            successModal.classList.add('visible');
        }, 100);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.querySelector('.purchase-success-modal')) {
                successModal.remove();
            }
        }, 5000);
    }

    showPurchaseError(message) {
        const errorModal = document.createElement('div');
        errorModal.className = 'purchase-error-modal';
        errorModal.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h2>Payment Failed</h2>
                <p>${message}</p>
                <button class="error-btn" onclick="this.closest('.purchase-error-modal').remove()">
                    Try Again
                </button>
            </div>
        `;
        document.body.appendChild(errorModal);
        
        setTimeout(() => {
            errorModal.classList.add('visible');
        }, 100);
    }

    showInsufficientTokensModal() {
        const modal = document.createElement('div');
        modal.className = 'insufficient-tokens-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-icon">💎</div>
                <h3>No Tokens Remaining</h3>
                <p>You need tokens to generate 3D models</p>
                <button class="buy-tokens-btn" onclick="window.EnhancedMonetization.instance.showPricingModal(); this.closest('.insufficient-tokens-modal').remove();">
                    Buy Tokens
                </button>
                <button class="close-btn" onclick="this.closest('.insufficient-tokens-modal').remove();">
                    Maybe Later
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showComingSoon(paymentMethod) {
        const modal = document.createElement('div');
        modal.className = 'coming-soon-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.closest('.coming-soon-modal').remove()"></div>
            <div class="modal-content">
                <h3>${paymentMethod} Coming Soon!</h3>
                <p>We're working on adding ${paymentMethod} support. Please use Credit Card for now.</p>
                <button onclick="this.closest('.coming-soon-modal').remove()">OK</button>
            </div>
        `;
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 100002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        document.body.appendChild(modal);
    }

    // Payment provider initialization
    initializePaymentProvider() {
        // Initialize Stripe with English locale
        if (window.Stripe) {
            this.stripe = window.Stripe(this.getStripePublicKey(), {
                locale: 'en'  // Force English locale
            });
        } else {
            // Load Stripe dynamically if not already loaded
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = () => {
                this.stripe = window.Stripe(this.getStripePublicKey(), {
                    locale: 'en'  // Force English locale
                });
            };
            document.head.appendChild(script);
        }
        
        // Initialize PayPal
        if (window.paypal) {
            // PayPal SDK initialization
        }
        
        // Initialize Google Pay
        if (window.google && window.google.payments) {
            // Google Pay initialization
        }
    }

    getStripePublicKey() {
        // Use test key for development, production key for live
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '10.0.2.2';
        
        // IMPORTANT: Replace with your actual Stripe keys
        // Get your test key from: https://dashboard.stripe.com/test/apikeys
        return isDev 
            ? 'pk_test_51RywsWRvMEG1D62RhurF4sS9iF8QQlnNxYlvwCiQvboIBNa1Ka50YW4imWLe4ac0DQ9iRjS9Koq1npM3U80PULBJ00AXgPrL4Y' // Replace with your actual test key
            : 'pk_live_YOUR_ACTUAL_LIVE_KEY'; // Replace with your actual live key
    }

    getApiBaseUrl() {
        return window.APP_CONFIG?.API_BASE_URL || 'http://localhost:3000/api';
    }

    // Inject enhanced styles
    injectStyles() {
        const styleId = 'enhanced-monetization-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            /* Enhanced Pricing Modal */
            .enhanced-pricing-modal {
                position: fixed;
                inset: 0;
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                visibility: hidden;
                opacity: 0;
                transition: all 0.3s ease;
            }

            .enhanced-pricing-modal.visible {
                visibility: visible;
                opacity: 1;
            }

            .pricing-modal-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.95);
                backdrop-filter: blur(20px);
            }

            .pricing-modal-content {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
                border-radius: 24px;
                padding: 2rem;
                max-width: 900px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 60px rgba(0, 188, 212, 0.3);
                border: 1px solid rgba(0, 188, 212, 0.2);
            }

            /* Header */
            .pricing-header {
                margin-bottom: 2rem;
            }

            .pricing-header-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .pricing-header h2 {
                font-family: 'Sora', sans-serif;
                font-size: 2rem;
                font-weight: 700;
                color: white;
                margin: 0;
            }

            .pricing-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pricing-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .pricing-subtitle {
                color: rgba(255, 255, 255, 0.7);
                font-size: 1rem;
                margin: 0 0 1.5rem 0;
            }

            .current-balance {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                background: rgba(0, 188, 212, 0.1);
                border: 1px solid rgba(0, 188, 212, 0.3);
                border-radius: 12px;
                padding: 0.5rem 1rem;
            }

            .balance-label {
                color: rgba(255, 255, 255, 0.7);
                font-size: 0.9rem;
            }

            .balance-amount {
                color: #00bcd4;
                font-weight: 600;
                font-size: 1rem;
            }

            /* Pricing Tiers */
            .pricing-tiers {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .tier-card {
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 1.5rem;
                position: relative;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .tier-card:hover {
                transform: translateY(-4px);
                border-color: rgba(0, 188, 212, 0.3);
                box-shadow: 0 20px 40px rgba(0, 188, 212, 0.2);
            }

            .tier-card.popular {
                background: linear-gradient(135deg, rgba(0, 188, 212, 0.1), rgba(0, 188, 212, 0.05));
                border-color: rgba(0, 188, 212, 0.5);
                transform: scale(1.05);
            }

            .popular-badge {
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #00bcd4, #00acc1);
                color: white;
                padding: 0.3rem 1rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            .savings-badge {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: rgba(76, 175, 80, 0.2);
                color: #4caf50;
                padding: 0.2rem 0.6rem;
                border-radius: 8px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .tier-header {
                margin-bottom: 1rem;
            }

            .tier-name {
                font-family: 'Sora', sans-serif;
                font-size: 1.2rem;
                font-weight: 600;
                color: white;
                margin: 0 0 0.5rem 0;
            }

            .tier-tokens {
                display: flex;
                align-items: baseline;
                gap: 0.3rem;
            }

            .token-amount {
                font-size: 2rem;
                font-weight: 700;
                color: #00bcd4;
            }

            .token-label {
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.9rem;
            }

            .tier-pricing {
                margin-bottom: 1rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .price-currency {
                font-size: 1.2rem;
                color: rgba(255, 255, 255, 0.8);
                vertical-align: top;
            }

            .price-amount {
                font-size: 2rem;
                font-weight: 700;
                color: white;
            }

            .price-per-token {
                display: block;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 0.3rem;
            }

            .tier-features {
                list-style: none;
                padding: 0;
                margin: 0 0 1.5rem 0;
                flex: 1;
            }

            .tier-features li {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
                color: rgba(255, 255, 255, 0.8);
                font-size: 0.9rem;
            }

            .tier-features svg {
                color: #4caf50;
                flex-shrink: 0;
            }

            .tier-buy-btn {
                width: 100%;
                padding: 0.8rem;
                background: rgba(0, 188, 212, 0.1);
                border: 2px solid rgba(0, 188, 212, 0.3);
                border-radius: 12px;
                color: #00bcd4;
                font-family: 'Sora', sans-serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .tier-buy-btn:hover {
                background: rgba(0, 188, 212, 0.2);
                border-color: #00bcd4;
                transform: translateY(-2px);
            }

            .tier-card.popular .tier-buy-btn {
                background: linear-gradient(135deg, #00bcd4, #00acc1);
                border-color: transparent;
                color: white;
            }

            /* Payment Methods */
            .payment-methods {
                margin-bottom: 2rem;
            }

            .payment-methods h3 {
                font-family: 'Sora', sans-serif;
                color: white;
                margin-bottom: 1rem;
                font-size: 1.2rem;
            }

            .payment-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 1rem;
            }

            .payment-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .payment-option:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.3);
            }

            .payment-option.active {
                background: rgba(0, 188, 212, 0.1);
                border-color: rgba(0, 188, 212, 0.5);
                color: #00bcd4;
            }

            /* Footer */
            .pricing-footer {
                text-align: center;
                padding-top: 1rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .security-note {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.85rem;
                margin: 0;
            }

            .security-note svg {
                color: #4caf50;
            }

            /* Purchase Loading Overlay */
            .purchase-loading-overlay {
                position: absolute;
                inset: 0;
                background: rgba(10, 10, 10, 0.98);
                backdrop-filter: blur(10px);
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 24px;
                z-index: 100;
            }

            .purchase-loading {
                text-align: center;
                color: white;
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 3px solid rgba(0, 188, 212, 0.2);
                border-top-color: #00bcd4;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .purchase-loading h3 {
                font-family: 'Sora', sans-serif;
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
            }

            .purchase-loading p {
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 0.5rem;
            }

            .loading-status {
                color: #00bcd4;
                font-size: 0.9rem;
            }

            /* Success/Error Modals */
            .purchase-success-modal,
            .purchase-error-modal,
            .coming-soon-modal {
                position: fixed;
                inset: 0;
                z-index: 100001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(20px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .purchase-success-modal.visible,
            .purchase-error-modal.visible {
                opacity: 1;
            }

            .success-content,
            .error-content,
            .coming-soon-modal .modal-content {
                background: linear-gradient(135deg, #1a1a2e, #0f0f1e);
                border-radius: 20px;
                padding: 2.5rem;
                text-align: center;
                max-width: 400px;
                width: 100%;
                border: 1px solid rgba(0, 188, 212, 0.3);
            }

            .error-content {
                border-color: rgba(220, 53, 69, 0.3);
            }

            .success-icon,
            .error-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
            }

            .success-content h2,
            .error-content h2 {
                font-family: 'Sora', sans-serif;
                color: white;
                margin-bottom: 0.5rem;
            }

            .success-content p,
            .error-content p {
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 1.5rem;
            }

            .success-balance {
                background: rgba(0, 188, 212, 0.1);
                border: 1px solid rgba(0, 188, 212, 0.3);
                border-radius: 12px;
                padding: 1rem;
                margin-bottom: 1.5rem;
                font-size: 1.1rem;
                color: rgba(255, 255, 255, 0.9);
            }

            .success-balance strong {
                color: #00bcd4;
                font-size: 1.3rem;
            }

            .success-btn,
            .error-btn {
                background: linear-gradient(135deg, #00bcd4, #00acc1);
                color: white;
                border: none;
                border-radius: 12px;
                padding: 1rem 2rem;
                font-family: 'Sora', sans-serif;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .error-btn {
                background: linear-gradient(135deg, #dc3545, #c82333);
            }

            .success-btn:hover,
            .error-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 188, 212, 0.3);
            }

            /* Insufficient Tokens Modal */
            .insufficient-tokens-modal {
                position: fixed;
                inset: 0;
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: modalFadeIn 0.3s ease;
            }

            .insufficient-tokens-modal .modal-overlay {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
            }

            .insufficient-tokens-modal .modal-content {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e, #0f0f1e);
                border-radius: 20px;
                padding: 2rem;
                max-width: 350px;
                width: 100%;
                text-align: center;
                border: 1px solid rgba(0, 188, 212, 0.3);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .insufficient-tokens-modal .modal-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: bounce 1s ease infinite;
            }

            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            .insufficient-tokens-modal h3 {
                font-family: 'Sora', sans-serif;
                color: white;
                margin-bottom: 0.5rem;
                font-size: 1.5rem;
            }

            .insufficient-tokens-modal p {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 1.5rem;
            }

            .insufficient-tokens-modal .buy-tokens-btn {
                background: linear-gradient(135deg, #00bcd4, #00e5ff);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 50px;
                font-family: 'Sora', sans-serif;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                margin-bottom: 0.8rem;
                transition: all 0.3s ease;
            }

            .insufficient-tokens-modal .buy-tokens-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 188, 212, 0.4);
            }

            .insufficient-tokens-modal .close-btn {
                background: transparent;
                color: rgba(255, 255, 255, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 0.8rem 1.5rem;
                border-radius: 50px;
                font-family: 'Sora', sans-serif;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            /* Visual states for credits container */
            .credits-container.no-credits {
                background: rgba(220, 53, 69, 0.1);
                border-color: rgba(220, 53, 69, 0.3);
                animation: pulse-red 2s ease-in-out infinite;
            }

            .credits-container.low-credits {
                background: rgba(255, 193, 7, 0.1);
                border-color: rgba(255, 193, 7, 0.3);
                animation: pulse-yellow 2s ease-in-out infinite;
            }

            .credits-container.unlimited {
                background: linear-gradient(135deg, rgba(0, 188, 212, 0.2), rgba(0, 229, 255, 0.1));
                border-color: rgba(0, 229, 255, 0.5);
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
            }

            @keyframes pulse-red {
                0%, 100% { box-shadow: 0 0 10px rgba(220, 53, 69, 0.2); }
                50% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.4); }
            }

            @keyframes pulse-yellow {
                0%, 100% { box-shadow: 0 0 10px rgba(255, 193, 7, 0.2); }
                50% { box-shadow: 0 0 20px rgba(255, 193, 7, 0.4); }
            }

            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .pricing-modal-content {
                    padding: 1.5rem;
                    margin: 0.5rem;
                }

                .pricing-header h2 {
                    font-size: 1.5rem;
                }

                .pricing-tiers {
                    grid-template-columns: 1fr;
                }

                .tier-card.popular {
                    transform: scale(1);
                }

                .payment-options {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 480px) {
                .pricing-modal-content {
                    padding: 1rem;
                }

                .tier-card {
                    padding: 1rem;
                }

                .token-amount {
                    font-size: 1.5rem;
                }

                .price-amount {
                    font-size: 1.5rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize the monetization system
window.EnhancedMonetization = {
    instance: null,
    init() {
        if (!this.instance) {
            this.instance = new EnhancedMonetization();
        }
        return this.instance;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize and make globally accessible
        window.enhancedMonetization = window.EnhancedMonetization.init();
        
        // Listen for auth state changes to sync tokens
        window.addEventListener('authStateChange', (event) => {
            if (event.detail.authenticated && event.detail.user) {
                window.enhancedMonetization.userTokens = event.detail.user.tokens || 1;
                window.enhancedMonetization.userId = event.detail.user.id;
                window.enhancedMonetization.isAdmin = event.detail.user.isAdmin;
                window.enhancedMonetization.updateTokensDisplay();
                console.log('💰 Auth state changed, tokens synced:', event.detail.user.tokens);
            }
        });
    });
} else {
    // Initialize and make globally accessible
    window.enhancedMonetization = window.EnhancedMonetization.init();
    
    // Listen for auth state changes to sync tokens
    window.addEventListener('authStateChange', (event) => {
        if (event.detail.authenticated && event.detail.user) {
            window.enhancedMonetization.userTokens = event.detail.user.tokens || 1;
            window.enhancedMonetization.userId = event.detail.user.id;
            window.enhancedMonetization.isAdmin = event.detail.user.isAdmin;
            window.enhancedMonetization.updateTokensDisplay();
            console.log('💰 Auth state changed, tokens synced:', event.detail.user.tokens);
        }
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedMonetization;
}