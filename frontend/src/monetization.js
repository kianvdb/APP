// mobile-monetization.js - DALMA AI Mobile Monetization System
// Updated to work with GenerateController - handles only credits and purchases

class MobileMonetization {
    constructor() {
        this.userCredits = 1; // Free tier: 1 generation for new users
        this.adWatchedCount = 0;
        this.generationInProgress = false;
        
        console.log('💰 MobileMonetization initialized');
        this.initializeMonetization();
    }

    initializeMonetization() {
        // Load user credits from storage
        this.loadUserCredits();
        
        // Update header credits display
        this.updateCreditsDisplay();
        
        // Setup purchase modal event handlers
        this.setupPurchaseModal();
        
        console.log('✅ Monetization system ready (credits only)');
    }

    // ========================================
    // CREDITS MANAGEMENT
    // ========================================

    loadUserCredits() {
        const savedCredits = localStorage.getItem('dalma_user_credits');
        if (savedCredits !== null) {
            this.userCredits = parseInt(savedCredits, 10);
        }
        
        console.log(`💳 User credits loaded: ${this.userCredits}`);
    }

    saveUserCredits() {
        localStorage.setItem('dalma_user_credits', this.userCredits.toString());
        this.updateCreditsDisplay();
    }

    getUserCredits() {
        return this.userCredits;
    }

    hasCredits() {
        return this.userCredits > 0;
    }

    consumeCredit() {
        if (this.userCredits > 0) {
            this.userCredits--;
            this.saveUserCredits();
            console.log(`💳 Credit consumed. Remaining: ${this.userCredits}`);
            return true;
        }
        return false;
    }

    addCredits(amount) {
        this.userCredits += amount;
        this.saveUserCredits();
        console.log(`💳 Credits added: +${amount}. Total: ${this.userCredits}`);
        
        // Show success animation
        this.showCreditsUpdateAnimation();
    }

    updateCreditsDisplay() {
        const creditsCount = document.getElementById('creditsCount');
        const creditsContainer = document.getElementById('creditsContainer');
        
        if (creditsCount) {
            creditsCount.textContent = this.userCredits;
            
            // Update container styling based on credits
            if (creditsContainer) {
                creditsContainer.classList.remove('low-credits', 'no-credits');
                
                if (this.userCredits === 0) {
                    creditsContainer.classList.add('no-credits');
                } else if (this.userCredits <= 2) {
                    creditsContainer.classList.add('low-credits');
                }
            }
        }

        // Update account section if visible
        const accountCreditsCount = document.getElementById('accountCreditsCount');
        if (accountCreditsCount) {
            accountCreditsCount.textContent = this.userCredits;
        }
    }

    showCreditsUpdateAnimation() {
        const creditsCount = document.getElementById('creditsCount');
        if (creditsCount) {
            creditsCount.classList.add('updating');
            setTimeout(() => {
                creditsCount.classList.remove('updating');
            }, 800);
        }
    }

    // ========================================
    // GENERATION INTEGRATION
    // ========================================

    checkCreditsBeforeGeneration() {
        if (!this.hasCredits()) {
            this.showInsufficientCreditsModal();
            return false;
        }
        return true;
    }

    // This is called by GenerateController before starting generation
    beforeGenerate() {
        if (!this.checkCreditsBeforeGeneration()) {
            return false;
        }
        
        // Consume credit
        this.consumeCredit();
        this.generationInProgress = true;
        
        return true;
    }

    // This is called by GenerateController when generation completes
    onGenerationComplete() {
        this.generationInProgress = false;
        console.log('💰 Generation completed successfully');
        
        // Show temporary success message
        this.showStatusMessage('🎉 3D model generated successfully!', 3000);
    }

    // This is called by GenerateController when generation fails
    onGenerationError(error) {
        this.generationInProgress = false;
        console.log('❌ Generation failed:', error);
        
        // Refund credit on error
        this.addCredits(1);
        this.showStatusMessage('💳 Credit refunded due to error', 3000);
    }

    showInsufficientCreditsModal() {
        // Remove any existing modal
        const existing = document.querySelector('.insufficient-credits-modal');
        if (existing) existing.remove();
        
        // Create premium styled modal
        const insufficientModal = document.createElement('div');
        insufficientModal.className = 'insufficient-credits-modal';
        insufficientModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-icon">💎</div>
                <h3>No Credits Remaining</h3>
                <p>You need credits to generate amazing 3D models</p>
                <button class="buy-credits-btn" onclick="window.MobileMonetization.showPricingModal(); this.closest('.insufficient-credits-modal').remove();">
                    Get 10 Credits for €4.99
                </button>
                <button class="close-btn" onclick="this.closest('.insufficient-credits-modal').remove();">
                    Maybe Later
                </button>
            </div>
        `;
        
        document.body.appendChild(insufficientModal);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .insufficient-credits-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: modalFadeIn 0.3s ease;
            }
            
            .insufficient-credits-modal .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
            }
            
            .insufficient-credits-modal .modal-content {
                position: relative;
                background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
                border-radius: 20px;
                padding: 2rem;
                max-width: 400px;
                margin: 1rem;
                text-align: center;
                border: 1px solid rgba(0, 188, 212, 0.3);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }
            
            .insufficient-credits-modal .modal-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
                animation: bounce 1s ease infinite;
            }
            
            .insufficient-credits-modal h3 {
                font-family: 'Sora', sans-serif;
                color: white;
                margin-bottom: 0.5rem;
                font-size: 1.5rem;
            }
            
            .insufficient-credits-modal p {
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 1.5rem;
            }
            
            .insufficient-credits-modal .buy-credits-btn {
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
            
            .insufficient-credits-modal .buy-credits-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 188, 212, 0.4);
            }
            
            .insufficient-credits-modal .close-btn {
                background: transparent;
                color: rgba(255, 255, 255, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 0.8rem 1.5rem;
                border-radius: 50px;
                font-family: 'Sora', sans-serif;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================
    // PURCHASE FLOW (€4.99 for 10 credits)
    // ========================================

    showPricingModal() {
        const modal = document.getElementById('pricingModal');
        if (modal) {
            modal.classList.add('visible');
        }
    }

    hidePricingModal() {
        const modal = document.getElementById('pricingModal');
        if (modal) {
            modal.classList.remove('visible');
        }
    }

    purchaseCredits() {
        console.log('💳 Starting purchase flow for €4.99');
        
        // In a real implementation, integrate with payment processor
        // For demo, simulate successful purchase
        this.simulatePurchase();
    }

    simulatePurchase() {
        const buyBtn = document.getElementById('buyPackBtn');
        
        if (buyBtn) {
            buyBtn.textContent = '⏳ Processing...';
            buyBtn.disabled = true;
            
            // Simulate payment processing
            setTimeout(() => {
                // Add 10 credits
                this.addCredits(10);
                
                // Show success
                this.showPurchaseSuccess();
                
                // Hide pricing modal
                this.hidePricingModal();
                
                // Reset button
                buyBtn.textContent = 'Buy 10 Credits';
                buyBtn.disabled = false;
                
            }, 2000);
        }
    }

    showPurchaseSuccess() {
        const successElement = document.createElement('div');
        successElement.className = 'purchase-success';
        successElement.innerHTML = `
            <div class="purchase-success-icon">🎉</div>
            <div class="purchase-success-title">Purchase Successful!</div>
            <div class="purchase-success-subtitle">10 credits added to your account</div>
        `;
        
        successElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: linear-gradient(135deg, #00bcd4, #00e5ff);
            padding: 2rem 3rem;
            border-radius: 20px;
            text-align: center;
            color: white;
            font-family: 'Sora', sans-serif;
            box-shadow: 0 20px 60px rgba(0, 188, 212, 0.4);
            z-index: 10001;
            opacity: 0;
            transition: all 0.3s ease;
        `;
        
        const iconStyle = `
            .purchase-success-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            .purchase-success-title {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
            }
            .purchase-success-subtitle {
                font-size: 1rem;
                opacity: 0.9;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = iconStyle;
        document.head.appendChild(style);
        
        document.body.appendChild(successElement);
        
        // Show success animation
        setTimeout(() => {
            successElement.style.opacity = '1';
            successElement.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 100);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            successElement.style.opacity = '0';
            successElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
            setTimeout(() => {
                if (successElement.parentElement) {
                    successElement.remove();
                }
            }, 300);
        }, 3000);
    }

    // ========================================
    // UI HELPERS
    // ========================================

    setupPurchaseModal() {
        // Close button
        const closeBtn = document.getElementById('pricingClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hidePricingModal());
        }

        // Buy button
        const buyBtn = document.getElementById('buyPackBtn');
        if (buyBtn) {
            buyBtn.addEventListener('click', () => this.purchaseCredits());
        }

        // Buy credits header button
        const buyCreditsBtn = document.getElementById('buyCreditsBtn');
        if (buyCreditsBtn) {
            buyCreditsBtn.addEventListener('click', () => this.showPricingModal());
        }

        // Close modal when clicking overlay
        const modal = document.getElementById('pricingModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hidePricingModal();
                }
            });
        }
    }

    showStatusMessage(message, duration = 3000) {
        const statusMsg = document.createElement('div');
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
            max-width: 90%;
        `;
        statusMsg.textContent = message;
        
        document.body.appendChild(statusMsg);
        
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
                if (statusMsg.parentElement) {
                    statusMsg.remove();
                }
            }, 300);
        }, duration);
    }
}

// Initialize mobile monetization system
window.MobileMonetization = new MobileMonetization();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileMonetization;
}