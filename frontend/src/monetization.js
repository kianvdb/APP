// mobile-monetization.js - DALMA AI Mobile Monetization System
// Handles credits, ad integration, and €4.99 purchase flow

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
        
        // Setup generation modal event handlers
        this.setupGenerationModal();
        
        console.log('✅ Monetization system ready');
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
    // GENERATION & AD INTEGRATION
    // ========================================

    checkCreditsBeforeGeneration() {
        if (!this.hasCredits()) {
            this.showInsufficientCreditsModal();
            return false;
        }
        return true;
    }

    startGeneration() {
        if (!this.checkCreditsBeforeGeneration()) {
            return false;
        }

        // Consume credit
        this.consumeCredit();
        
        // Start generation process with ad integration
        this.generationInProgress = true;
        this.showGenerationModal();
        
        return true;
    }

    showGenerationModal() {
        const modal = document.getElementById('generationModal');
        if (modal) {
            modal.classList.add('visible');
            
            // Start progress simulation
            this.simulateGenerationProgress();
        }
    }

    hideGenerationModal() {
        const modal = document.getElementById('generationModal');
        if (modal) {
            modal.classList.remove('visible');
            this.generationInProgress = false;
        }
    }

    simulateGenerationProgress() {
        const progressBar = document.getElementById('generationProgressBar');
        const timeDisplay = document.getElementById('generationTime');
        
        let progress = 0;
        let timeRemaining = 300; // 5 minutes in seconds
        
        const updateProgress = () => {
            if (!this.generationInProgress) return;
            
            progress += Math.random() * 2; // Slow, realistic progress
            timeRemaining -= 1;
            
            if (progressBar) {
                progressBar.style.width = Math.min(progress, 95) + '%'; // Never quite reach 100% until done
            }
            
            if (timeDisplay) {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                timeDisplay.textContent = `Estimated time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Generation complete
            if (timeRemaining <= 0 || progress >= 100) {
                this.completeGeneration();
                return;
            }
            
            setTimeout(updateProgress, 1000);
        };
        
        updateProgress();
    }

    watchAd() {
        console.log('📺 User clicked watch ad');
        
        // In a real implementation, you'd integrate with an ad network
        // For now, simulate ad watching
        this.simulateAdWatch();
    }

    simulateAdWatch() {
        const watchAdBtn = document.getElementById('watchAdBtn');
        
        if (watchAdBtn) {
            watchAdBtn.textContent = '⏳ Loading Ad...';
            watchAdBtn.disabled = true;
            
            // Simulate 30-second ad
            setTimeout(() => {
                this.adWatchedCount++;
                
                // Speed up generation (reduce time by 30%)
                this.speedUpGeneration();
                
                watchAdBtn.textContent = '✅ Ad Watched - Speed Boost Applied!';
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    watchAdBtn.textContent = '📺 Watch Another Ad for More Speed';
                    watchAdBtn.disabled = false;
                }, 3000);
                
            }, 3000); // 3 seconds for demo, would be 30+ seconds for real ad
        }
    }

    speedUpGeneration() {
        // In real implementation, this would actually speed up the server processing
        console.log(`⚡ Generation speed boosted! Ads watched: ${this.adWatchedCount}`);
        
        // Visual feedback
        const timeDisplay = document.getElementById('generationTime');
        if (timeDisplay) {
            timeDisplay.style.color = '#00e5ff';
            timeDisplay.innerHTML = '⚡ Speed Boost Active! Faster processing...';
        }
    }

    completeGeneration() {
        const progressBar = document.getElementById('generationProgressBar');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // Hide modal after 2 seconds
        setTimeout(() => {
            this.hideGenerationModal();
            
            // Show success message or trigger model display
            this.showGenerationSuccess();
        }, 2000);
    }

    showGenerationSuccess() {
        // This would integrate with your existing generation success flow
        console.log('🎉 Generation completed successfully!');
        
        // Show temporary success message
        this.showStatusMessage('🎉 3D model generated successfully!', 3000);
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

    showInsufficientCreditsModal() {
        // Create and show insufficient credits modal
        const insufficientModal = document.createElement('div');
        insufficientModal.className = 'insufficient-credits';
        insufficientModal.innerHTML = `
            <h3>⚠️ No Credits Remaining</h3>
            <p>You need credits to generate 3D models.</p>
            <button onclick="window.MobileMonetization.showPricingModal(); this.parentElement.remove();" 
                    style="background: #00bcd4; color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-family: 'Sora', sans-serif; font-weight: 600;">
                Buy 10 Credits for €4.99
            </button>
        `;
        
        document.body.appendChild(insufficientModal);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (insufficientModal.parentElement) {
                insufficientModal.remove();
            }
        }, 5000);
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
        
        document.body.appendChild(successElement);
        
        // Show success animation
        setTimeout(() => {
            successElement.classList.add('visible');
        }, 100);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            successElement.classList.remove('visible');
            setTimeout(() => {
                if (successElement.parentElement) {
                    successElement.remove();
                }
            }, 500);
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

    setupGenerationModal() {
        // Watch ad button
        const watchAdBtn = document.getElementById('watchAdBtn');
        if (watchAdBtn) {
            watchAdBtn.addEventListener('click', () => this.watchAd());
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

    // ========================================
    // INTEGRATION WITH EXISTING GENERATE FLOW
    // ========================================

    // Call this from your existing generate button click handler
    beforeGenerate() {
        return this.startGeneration();
    }

    // Call this when generation actually completes
    onGenerationComplete() {
        this.completeGeneration();
    }

    // Call this when generation fails
    onGenerationError(error) {
        this.hideGenerationModal();
        this.showStatusMessage(`❌ Generation failed: ${error}`, 5000);
        
        // Refund credit on error
        this.addCredits(1);
        this.showStatusMessage('💳 Credit refunded due to error', 3000);
    }
}

// Initialize mobile monetization system
window.MobileMonetization = new MobileMonetization();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileMonetization;
}