// ad-manager.js - Native + Web Hybrid Ad Manager with Waterfall Strategy
// Supports Android WebView, iOS WebView, and Web deployment

class AdManager {
    constructor() {
        this.networks = {
            unity: {
                enabled: false,
                gameId: null,
                placementId: 'rewardedVideo',
                ecpm: 8.0, // Average $8-15 eCPM for rewarded video
                priority: 1,
                testMode: true, // Set to false for production
                // Your Unity Game IDs - CHANGE THESE
                androidGameId: '5928380', // Replace with your Android Game ID
                iosGameId: '5928381'      // Replace with your iOS Game ID
            },
            admob: {
                enabled: false,
                appId: null,
                rewardedAdUnitId: null,
                interstitialAdUnitId: null,
                ecpm: 6.0, // Average $6-12 eCPM
                priority: 2,
                // Your AdMob IDs - CHANGE THESE
                androidAppId: 'ca-app-pub-3940256099942544~3347511713', // Test ID - Replace with yours
                androidRewardedId: 'ca-app-pub-3940256099942544/5224354917', // Test ID - Replace with yours
                iosAppId: 'ca-app-pub-3940256099942544~1458002511', // Test ID - Replace with yours
                iosRewardedId: 'ca-app-pub-3940256099942544/1712485313' // Test ID - Replace with yours
            },
            ironSource: {
                enabled: false,
                appKey: 'YOUR_IRONSOURCE_APP_KEY', // Replace with your app key
                ecpm: 7.0, // Average $7-14 eCPM
                priority: 3
            },
            appLovin: {
                enabled: false,
                sdkKey: 'YOUR_APPLOVIN_SDK_KEY', // Replace with your SDK key
                ecpm: 5.5, // Average $5-10 eCPM
                priority: 4
            },
            vungle: {
                enabled: false,
                appId: 'YOUR_VUNGLE_APP_ID', // Replace with your app ID
                placementId: 'YOUR_VUNGLE_PLACEMENT_ID', // Replace with your placement ID
                ecpm: 5.0, // Average $5-9 eCPM
                priority: 5
            }
        };
        
        this.platform = this.detectPlatform();
        this.currentNetwork = null;
        this.adReady = false;
        this.adWatched = false;
        this.rewardCallback = null;
        this.skipCallback = null;
        this.errorCallback = null;
        this.isShowingAd = false; // Prevent interference with generation
        
        // Analytics
        this.analytics = {
            impressions: 0,
            completions: 0,
            skips: 0,
            revenue: 0,
            networkPerformance: {}
        };
        
        // Initialize based on platform
        this.initializeNetworks();
    }
    
    detectPlatform() {
        // Check for native Android interface
        if (window.AndroidAds || window.UnityAdsAndroid) {
            console.log('📱 Android WebView detected');
            return 'android-webview';
        }
        
        // Check for native iOS interface
        if (window.webkit && window.webkit.messageHandlers && 
            (window.webkit.messageHandlers.unityAds || window.webkit.messageHandlers.admob)) {
            console.log('📱 iOS WebView detected');
            return 'ios-webview';
        }
        
        // Check for mobile web
        const userAgent = navigator.userAgent;
        if (/Android/i.test(userAgent)) {
            console.log('🌐 Android Web Browser detected');
            return 'android-web';
        }
        
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            console.log('🌐 iOS Web Browser detected');
            return 'ios-web';
        }
        
        // Desktop or other
        console.log('💻 Desktop/Web detected');
        return 'web';
    }
    
    initializeNetworks() {
        console.log('🎯 Initializing ad networks for platform:', this.platform);
        
        switch(this.platform) {
            case 'android-webview':
                this.initializeAndroidNativeAds();
                break;
            case 'ios-webview':
                this.initializeIOSNativeAds();
                break;
            case 'android-web':
            case 'ios-web':
            case 'web':
            default:
                this.initializeWebAds();
                break;
        }
        
        // Log initialization status
        console.log('📊 Network initialization status:', this.getNetworkStatus());
    }
    
    // ANDROID NATIVE INITIALIZATION
    initializeAndroidNativeAds() {
        console.log('🤖 Initializing Android native ads...');
        
        // Check for Unity Ads Android interface
        if (window.UnityAdsAndroid) {
            this.networks.unity.enabled = true;
            this.networks.unity.gameId = this.networks.unity.androidGameId;
            console.log('✅ Unity Ads Android interface available');
            
            // Check if ad is ready
            if (window.UnityAdsAndroid.isReady && window.UnityAdsAndroid.isReady()) {
                this.adReady = true;
            }
        }
        
        // Check for AdMob Android interface
        if (window.AndroidAds) {
            this.networks.admob.enabled = true;
            this.networks.admob.appId = this.networks.admob.androidAppId;
            this.networks.admob.rewardedAdUnitId = this.networks.admob.androidRewardedId;
            console.log('✅ AdMob Android interface available');
            
            // Request ad load
            if (window.AndroidAds.loadRewardedAd) {
                window.AndroidAds.loadRewardedAd();
            }
        }
        
        // Set up message receivers for callbacks
        this.setupAndroidCallbacks();
    }
    
    setupAndroidCallbacks() {
        // These will be called from native Android code
        window.AdManagerAndroidCallbacks = {
            onAdLoaded: () => {
                console.log('✅ Android ad loaded');
                this.adReady = true;
            },
            onAdCompleted: () => {
                console.log('✅ Android ad completed');
                this.isShowingAd = false;
                this.adWatched = true;
                if (this.rewardCallback) {
                    this.rewardCallback();
                }
                this.analytics.completions++;
                this.estimateRevenue(this.currentNetwork);
            },
            onAdSkipped: () => {
                console.log('⏭️ Android ad skipped');
                this.isShowingAd = false;
                if (this.skipCallback) {
                    this.skipCallback();
                }
                this.analytics.skips++;
            },
            onAdFailed: (error) => {
                console.error('❌ Android ad failed:', error);
                this.isShowingAd = false;
                this.fallbackToNextNetwork();
            }
        };
    }
    
    // IOS NATIVE INITIALIZATION
    initializeIOSNativeAds() {
        console.log('🍎 Initializing iOS native ads...');
        
        // Check for Unity Ads iOS interface
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.unityAds) {
            this.networks.unity.enabled = true;
            this.networks.unity.gameId = this.networks.unity.iosGameId;
            console.log('✅ Unity Ads iOS interface available');
            
            // Request initialization
            window.webkit.messageHandlers.unityAds.postMessage({
                action: 'initialize',
                gameId: this.networks.unity.iosGameId,
                testMode: this.networks.unity.testMode
            });
        }
        
        // Check for AdMob iOS interface
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.admob) {
            this.networks.admob.enabled = true;
            this.networks.admob.appId = this.networks.admob.iosAppId;
            this.networks.admob.rewardedAdUnitId = this.networks.admob.iosRewardedId;
            console.log('✅ AdMob iOS interface available');
            
            // Request ad load
            window.webkit.messageHandlers.admob.postMessage({
                action: 'loadRewardedAd',
                adUnitId: this.networks.admob.iosRewardedId
            });
        }
        
        // Set up message receivers for callbacks
        this.setupIOSCallbacks();
    }
    
    setupIOSCallbacks() {
        // These will be called from native iOS code
        window.AdManagerIOSCallbacks = {
            onAdLoaded: () => {
                console.log('✅ iOS ad loaded');
                this.adReady = true;
            },
            onAdCompleted: () => {
                console.log('✅ iOS ad completed');
                this.isShowingAd = false;
                this.adWatched = true;
                if (this.rewardCallback) {
                    this.rewardCallback();
                }
                this.analytics.completions++;
                this.estimateRevenue(this.currentNetwork);
            },
            onAdSkipped: () => {
                console.log('⏭️ iOS ad skipped');
                this.isShowingAd = false;
                if (this.skipCallback) {
                    this.skipCallback();
                }
                this.analytics.skips++;
            },
            onAdFailed: (error) => {
                console.error('❌ iOS ad failed:', error);
                this.isShowingAd = false;
                this.fallbackToNextNetwork();
            }
        };
    }
    
    // WEB INITIALIZATION (Fallback for browser)
    initializeWebAds() {
        console.log('🌐 Initializing web ads...');
        
        // Try Unity Ads Web SDK
        if (typeof UnityAds !== 'undefined' || window.unityads) {
            this.initializeUnityWebAds();
        }
        
        // Try Google AdSense for web
        if (window.adsbygoogle) {
            this.networks.adsense = {
                enabled: true,
                ecpm: 2.0, // Lower eCPM for display ads
                priority: 10
            };
            console.log('✅ AdSense available for web fallback');
        }
        
        // Always enable fallback
        console.log('✅ Fallback ad system ready');
    }
    
    initializeUnityWebAds() {
        if (typeof UnityAds === 'undefined') return;
        
        const config = {
            gameId: this.platform.includes('ios') ? this.networks.unity.iosGameId : this.networks.unity.androidGameId,
            testMode: this.networks.unity.testMode,
            enablePerPlacementLoad: true
        };
        
        console.log('🎮 Initializing Unity Web Ads with config:', config);
        
        UnityAds.init(config.gameId, config.testMode, (result) => {
            if (result === 'initialized') {
                this.networks.unity.enabled = true;
                console.log('✅ Unity Ads Web SDK initialized');
                this.loadUnityWebAd();
            }
        });
    }
    
    loadUnityWebAd() {
        if (typeof UnityAds === 'undefined' || !UnityAds.isReady) return;
        
        if (UnityAds.isReady(this.networks.unity.placementId)) {
            this.adReady = true;
            console.log('✅ Unity Web Ad ready');
        }
    }
    
    // MAIN PUBLIC METHOD - Show Rewarded Ad
    async showRewardedAd(onComplete, onSkip, onError) {
        // Prevent showing ads if one is already showing
        if (this.isShowingAd) {
            console.log('⚠️ Ad already showing, skipping request');
            if (onError) onError('Ad already showing');
            return;
        }
        
        console.log('📺 Starting waterfall ad system for platform:', this.platform);
        
        this.rewardCallback = onComplete;
        this.skipCallback = onSkip;
        this.errorCallback = onError;
        this.adWatched = false;
        
        // Try networks in order of priority (highest eCPM first)
        const sortedNetworks = this.getSortedNetworks();
        
        console.log('📊 Waterfall order:', sortedNetworks.map(n => n.name));
        
        // Try each network in order
        for (const network of sortedNetworks) {
            if (network.enabled) {
                console.log(`🎯 Trying ${network.name} (eCPM: $${network.ecpm})`);
                this.currentNetwork = network.name;
                
                // Try to show ad for this network
                const success = await this.tryShowAdForNetwork(network.name);
                if (success) {
                    this.analytics.impressions++;
                    return; // Ad shown successfully
                }
            }
        }
        
        // No networks available, show fallback
        console.log('📺 All networks failed, showing fallback ad');
        this.currentNetwork = 'fallback';
        this.showFallbackAd();
    }
    
    async tryShowAdForNetwork(networkName) {
        return new Promise((resolve) => {
            // Set a timeout for each network attempt
            const timeout = setTimeout(() => {
                console.log(`⏱️ ${networkName} timed out`);
                resolve(false);
            }, 3000); // 3 second timeout per network
            
            switch(networkName) {
                case 'unity':
                    if (this.showUnityAd()) {
                        clearTimeout(timeout);
                        resolve(true);
                    } else {
                        clearTimeout(timeout);
                        resolve(false);
                    }
                    break;
                    
                case 'admob':
                    if (this.showAdMobAd()) {
                        clearTimeout(timeout);
                        resolve(true);
                    } else {
                        clearTimeout(timeout);
                        resolve(false);
                    }
                    break;
                    
                case 'ironSource':
                    if (this.showIronSourceAd()) {
                        clearTimeout(timeout);
                        resolve(true);
                    } else {
                        clearTimeout(timeout);
                        resolve(false);
                    }
                    break;
                    
                default:
                    clearTimeout(timeout);
                    resolve(false);
            }
        });
    }
    
    // SHOW UNITY AD
    showUnityAd() {
        console.log('🎮 Attempting to show Unity Ad...');
        
        // Android WebView
        if (this.platform === 'android-webview' && window.UnityAdsAndroid) {
            if (window.UnityAdsAndroid.isReady && window.UnityAdsAndroid.isReady()) {
                window.UnityAdsAndroid.showUnityAd();
                this.isShowingAd = true;
                return true;
            }
            return false;
        }
        
        // iOS WebView
        if (this.platform === 'ios-webview' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.unityAds) {
            window.webkit.messageHandlers.unityAds.postMessage({
                action: 'show',
                placementId: this.networks.unity.placementId
            });
            this.isShowingAd = true;
            return true;
        }
        
        // Web SDK
        if (typeof UnityAds !== 'undefined' && UnityAds.isReady && UnityAds.isReady(this.networks.unity.placementId)) {
            this.isShowingAd = true;
            UnityAds.show(this.networks.unity.placementId, {
                onStart: (placementId) => {
                    console.log(`Unity Ad started: ${placementId}`);
                },
                onComplete: (placementId) => {
                    console.log(`Unity Ad completed: ${placementId}`);
                    this.isShowingAd = false;
                    this.onAdCompleted();
                },
                onSkipped: (placementId) => {
                    console.log(`Unity Ad skipped: ${placementId}`);
                    this.isShowingAd = false;
                    this.onAdSkipped();
                },
                onFailed: (placementId, error, message) => {
                    console.error(`Unity Ad failed: ${message}`);
                    this.isShowingAd = false;
                    this.fallbackToNextNetwork();
                }
            });
            return true;
        }
        
        return false;
    }
    
    // SHOW ADMOB AD
    showAdMobAd() {
        console.log('📱 Attempting to show AdMob ad...');
        
        // Android WebView
        if (this.platform === 'android-webview' && window.AndroidAds) {
            if (window.AndroidAds.showRewardedAd) {
                window.AndroidAds.showRewardedAd();
                this.isShowingAd = true;
                return true;
            }
            return false;
        }
        
        // iOS WebView
        if (this.platform === 'ios-webview' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.admob) {
            window.webkit.messageHandlers.admob.postMessage({
                action: 'showRewardedAd'
            });
            this.isShowingAd = true;
            return true;
        }
        
        // Web (AdMob not available for web, use AdSense instead)
        return false;
    }
    
    // SHOW IRONSOURCE AD
    showIronSourceAd() {
        console.log('💎 Attempting to show IronSource ad...');
        
        // Android WebView
        if (this.platform === 'android-webview' && window.IronSourceAndroid) {
            if (window.IronSourceAndroid.isRewardedVideoAvailable && window.IronSourceAndroid.isRewardedVideoAvailable()) {
                window.IronSourceAndroid.showRewardedVideo();
                this.isShowingAd = true;
                return true;
            }
            return false;
        }
        
        // iOS WebView
        if (this.platform === 'ios-webview' && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ironSource) {
            window.webkit.messageHandlers.ironSource.postMessage({
                action: 'showRewardedVideo'
            });
            this.isShowingAd = true;
            return true;
        }
        
        return false;
    }
    
    // FALLBACK AD (Always works)
    showFallbackAd() {
        console.log('🎬 Showing fallback ad with timer');
        
        // Remove any existing ad modal
        const existingModal = document.getElementById('adModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create the ad modal
        this.createFallbackAdModal();
        
        // Show the modal
        const adModal = document.getElementById('adModal');
        if (adModal) {
            adModal.style.display = 'flex';
            this.isShowingAd = true;
            this.analytics.impressions++;
            
            // Start the countdown timer
            this.startAdTimer(15); // 15 second ad
        }
    }
    
    createFallbackAdModal() {
        const modal = document.createElement('div');
        modal.id = 'adModal';
        modal.className = 'ad-modal';
        modal.innerHTML = `
            <div class="ad-modal-overlay"></div>
            <div class="ad-modal-content">
                <div class="ad-header">
                    <h3>Watch Ad for 2x Speed Boost</h3>
                    <div class="ad-timer-wrapper">
                        <svg class="timer-circle" width="60" height="60">
                            <circle cx="30" cy="30" r="25" class="timer-bg"/>
                            <circle cx="30" cy="30" r="25" class="timer-progress" id="timerProgress"/>
                        </svg>
                        <span class="ad-timer" id="adTimer">15</span>
                    </div>
                </div>
                
                <div class="ad-container">
                    <!-- Simulated Ad Content -->
                    <div class="simulated-ad">
                        <div class="ad-image-placeholder">
                            <div class="ad-logo">📱</div>
                            <h4>Premium 3D Models</h4>
                            <p>Create stunning 3D content with Threely</p>
                            <div class="ad-features">
                                <div class="feature">✨ High Quality</div>
                                <div class="feature">⚡ Fast Generation</div>
                                <div class="feature">🎨 Multiple Formats</div>
                            </div>
                        </div>
                    </div>
                    <div class="ad-disclaimer">Advertisement</div>
                </div>
                
                <div class="ad-footer">
                    <button class="skip-ad-btn" id="skipAdBtn" disabled>
                        <span id="skipText">Skip in <span id="skipCountdown">5</span>s</span>
                    </button>
                    <div class="ad-reward-info">
                        <span class="reward-icon">⚡</span>
                        <span>Complete ad for 2x faster generation</span>
                    </div>
                </div>
            </div>
            
            <style>
                .ad-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 100000;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    animation: fadeIn 0.3s ease;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .ad-modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.95);
                    backdrop-filter: blur(10px);
                }
                
                .ad-modal-content {
                    position: relative;
                    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                    border-radius: 20px;
                    padding: 1.5rem;
                    max-width: 400px;
                    width: 100%;
                    border: 2px solid rgba(0, 188, 212, 0.3);
                    box-shadow: 0 20px 60px rgba(0, 188, 212, 0.2);
                }
                
                .ad-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .ad-header h3 {
                    font-family: 'Sora', sans-serif;
                    color: white;
                    margin: 0;
                    font-size: 1.2rem;
                }
                
                .ad-timer-wrapper {
                    position: relative;
                    width: 60px;
                    height: 60px;
                }
                
                .timer-circle {
                    transform: rotate(-90deg);
                }
                
                .timer-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.1);
                    stroke-width: 4;
                }
                
                .timer-progress {
                    fill: none;
                    stroke: #00bcd4;
                    stroke-width: 4;
                    stroke-linecap: round;
                    stroke-dasharray: 157;
                    stroke-dashoffset: 0;
                    transition: stroke-dashoffset 1s linear;
                }
                
                .ad-timer {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    color: #00bcd4;
                    font-family: 'Sora', sans-serif;
                    font-weight: 700;
                    font-size: 1.2rem;
                }
                
                .ad-container {
                    background: rgba(0, 0, 0, 0.5);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    min-height: 250px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                
                .ad-disclaimer {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.5);
                    font-family: 'Inter', sans-serif;
                }
                
                .simulated-ad {
                    text-align: center;
                    animation: pulseGlow 2s ease-in-out infinite;
                }
                
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                
                .ad-image-placeholder {
                    padding: 2rem;
                }
                
                .ad-logo {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    animation: bounce 2s ease-in-out infinite;
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                .simulated-ad h4 {
                    color: #00bcd4;
                    font-family: 'Sora', sans-serif;
                    margin-bottom: 0.5rem;
                    font-size: 1.3rem;
                }
                
                .simulated-ad p {
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 1.5rem;
                }
                
                .ad-features {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .feature {
                    background: rgba(0, 188, 212, 0.1);
                    border: 1px solid rgba(0, 188, 212, 0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    color: #00bcd4;
                    font-size: 0.85rem;
                }
                
                .ad-footer {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .skip-ad-btn {
                    width: 100%;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    font-family: 'Sora', sans-serif;
                    font-weight: 600;
                    cursor: not-allowed;
                    transition: all 0.3s ease;
                }
                
                .skip-ad-btn:not(:disabled) {
                    background: rgba(220, 53, 69, 0.2);
                    border-color: #dc3545;
                    color: #dc3545;
                    cursor: pointer;
                }
                
                .skip-ad-btn:not(:disabled):hover {
                    background: rgba(220, 53, 69, 0.3);
                }
                
                .ad-reward-info {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }
                
                .reward-icon {
                    font-size: 1.2rem;
                    animation: sparkle 1s ease-in-out infinite;
                }
                
                @keyframes sparkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.2); }
                }
            </style>
        `;
        
        document.body.appendChild(modal);
    }
    
    startAdTimer(duration) {
        let timeLeft = duration;
        let skipTime = 5;
        const timerEl = document.getElementById('adTimer');
        const skipBtn = document.getElementById('skipAdBtn');
        const skipCountdown = document.getElementById('skipCountdown');
        const skipText = document.getElementById('skipText');
        const timerProgress = document.getElementById('timerProgress');
        
        // Calculate progress for circular timer
        const circumference = 2 * Math.PI * 25;
        if (timerProgress) {
            timerProgress.style.strokeDasharray = circumference;
            timerProgress.style.strokeDashoffset = 0;
        }
        
        const interval = setInterval(() => {
            timeLeft--;
            skipTime--;
            
            // Update timer display
            if (timerEl) {
                timerEl.textContent = timeLeft;
            }
            
            // Update circular progress
            if (timerProgress) {
                const progress = (duration - timeLeft) / duration;
                const offset = circumference - (progress * circumference);
                timerProgress.style.strokeDashoffset = offset;
            }
            
            // Handle skip button
            if (skipTime <= 0 && skipBtn) {
                skipBtn.disabled = false;
                if (skipText) {
                    skipText.innerHTML = 'Skip Ad';
                }
                skipBtn.onclick = () => {
                    clearInterval(interval);
                    this.onAdSkipped();
                };
            } else if (skipCountdown && skipTime > 0) {
                skipCountdown.textContent = skipTime;
            }
            
            // Ad completed
            if (timeLeft <= 0) {
                clearInterval(interval);
                this.onAdCompleted();
            }
        }, 1000);
    }
    
    // CALLBACKS
    onAdCompleted() {
        console.log('✅ Ad completed!');
        this.adWatched = true;
        this.isShowingAd = false;
        
        // Show completion animation for fallback
        if (this.currentNetwork === 'fallback') {
            this.showCompletionAnimation();
        }
        
        // Hide modal after animation
        setTimeout(() => {
            const modal = document.getElementById('adModal');
            if (modal) {
                modal.style.opacity = '0';
                setTimeout(() => modal.remove(), 300);
            }
            
            // Execute callback
            if (this.rewardCallback) {
                this.rewardCallback();
            }
        }, this.currentNetwork === 'fallback' ? 1000 : 100);
        
        // Update analytics
        this.analytics.completions++;
        this.estimateRevenue(this.currentNetwork);
        
        // Log analytics
        this.logAdEvent('completed', this.currentNetwork);
        
        // Prepare next ad
        this.prepareNextAd();
    }
    
    onAdSkipped() {
        console.log('⏭️ Ad skipped');
        this.isShowingAd = false;
        
        // Hide modal
        const modal = document.getElementById('adModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        }
        
        // Execute callback
        if (this.skipCallback) {
            this.skipCallback();
        }
        
        // Update analytics
        this.analytics.skips++;
        
        // Log analytics
        this.logAdEvent('skipped', this.currentNetwork);
    }
    
    showCompletionAnimation() {
        const modalContent = document.querySelector('.ad-modal-content');
        if (modalContent) {
            const successOverlay = document.createElement('div');
            successOverlay.className = 'ad-success-overlay';
            successOverlay.innerHTML = `
                <div class="success-icon">✅</div>
                <div class="success-text">Speed Boost Activated!</div>
                <div class="success-multiplier">2x</div>
            `;
            successOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 188, 212, 0.95);
                border-radius: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                animation: successFadeIn 0.3s ease;
                z-index: 1000;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes successFadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
                .success-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    animation: successBounce 0.5s ease;
                }
                .success-text {
                    color: white;
                    font-family: 'Sora', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                .success-multiplier {
                    color: white;
                    font-family: 'Sora', sans-serif;
                    font-size: 3rem;
                    font-weight: 800;
                    margin-top: 0.5rem;
                    animation: pulse 0.5s ease infinite alternate;
                }
                @keyframes successBounce {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                @keyframes pulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
            
            modalContent.appendChild(successOverlay);
        }
    }
    
    // UTILITIES
    getSortedNetworks() {
        return Object.entries(this.networks)
            .map(([name, config]) => ({ name, ...config }))
            .filter(n => n.enabled)
            .sort((a, b) => a.priority - b.priority); // Lower priority number = higher priority
    }
    
    fallbackToNextNetwork() {
        const sortedNetworks = this.getSortedNetworks();
        const currentIndex = sortedNetworks.findIndex(n => n.name === this.currentNetwork);
        
        console.log(`⚠️ Network ${this.currentNetwork} failed, trying next...`);
        
        if (currentIndex < sortedNetworks.length - 1) {
            const nextNetwork = sortedNetworks[currentIndex + 1];
            this.currentNetwork = nextNetwork.name;
            console.log(`🔄 Falling back to ${nextNetwork.name}`);
            this.tryShowAdForNetwork(nextNetwork.name);
        } else {
            console.log('📺 All networks exhausted, showing fallback');
            this.currentNetwork = 'fallback';
            this.showFallbackAd();
        }
    }
    
    estimateRevenue(network) {
        const ecpm = this.networks[network]?.ecpm || 1.0;
        const revenue = ecpm / 1000; // Revenue per impression
        this.analytics.revenue += revenue;
        
        if (!this.analytics.networkPerformance[network]) {
            this.analytics.networkPerformance[network] = {
                impressions: 0,
                completions: 0,
                skips: 0,
                revenue: 0
            };
        }
        
        this.analytics.networkPerformance[network].impressions++;
        this.analytics.networkPerformance[network].completions++;
        this.analytics.networkPerformance[network].revenue += revenue;
        
        console.log(`💰 Estimated revenue: $${revenue.toFixed(4)} from ${network}`);
    }
    
    prepareNextAd() {
        // Pre-load next ad based on platform
        setTimeout(() => {
            if (this.platform === 'android-webview') {
                if (window.AndroidAds && window.AndroidAds.loadRewardedAd) {
                    window.AndroidAds.loadRewardedAd();
                }
                if (window.UnityAdsAndroid && window.UnityAdsAndroid.load) {
                    window.UnityAdsAndroid.load();
                }
            } else if (this.platform === 'ios-webview') {
                if (window.webkit && window.webkit.messageHandlers) {
                    if (window.webkit.messageHandlers.admob) {
                        window.webkit.messageHandlers.admob.postMessage({
                            action: 'loadRewardedAd'
                        });
                    }
                    if (window.webkit.messageHandlers.unityAds) {
                        window.webkit.messageHandlers.unityAds.postMessage({
                            action: 'load'
                        });
                    }
                }
            } else {
                // Web - reload Unity if available
                if (this.networks.unity.enabled) {
                    this.loadUnityWebAd();
                }
            }
        }, 1000);
    }
    
    getNetworkStatus() {
        return Object.entries(this.networks).map(([name, config]) => ({
            network: name,
            enabled: config.enabled,
            ecpm: config.ecpm,
            priority: config.priority
        }));
    }
    
    logAdEvent(event, network) {
        // Send to your analytics
        if (window.gtag) {
            gtag('event', 'ad_' + event, {
                'ad_network': network,
                'platform': this.platform,
                'estimated_revenue': this.analytics.revenue
            });
        }
        
        console.log(`📊 Ad Event: ${event} on ${network} (${this.platform})`, this.analytics);
    }
    
    // Get analytics data
    getAnalytics() {
        const impressions = this.analytics.impressions || 1;
        const completions = this.analytics.completions || 0;
        const skips = this.analytics.skips || 0;
        
        return {
            ...this.analytics,
            fillRate: ((impressions / (impressions + (this.analytics.errors || 0))) * 100).toFixed(2) + '%',
            completionRate: ((completions / impressions) * 100).toFixed(2) + '%',
            skipRate: ((skips / impressions) * 100).toFixed(2) + '%',
            averageECPM: impressions > 0 ? (this.analytics.revenue / (impressions / 1000)).toFixed(2) : '0.00',
            platform: this.platform,
            networksEnabled: this.getSortedNetworks().map(n => n.name)
        };
    }
    
    // Check if ad is currently showing (to prevent interference with generation)
    isAdShowing() {
        return this.isShowingAd;
    }
    
    // Debug function to test specific network
    testNetwork(networkName) {
        console.log(`🧪 Testing ${networkName} ad...`);
        this.currentNetwork = networkName;
        
        switch(networkName) {
            case 'unity':
                return this.showUnityAd();
            case 'admob':
                return this.showAdMobAd();
            case 'ironSource':
                return this.showIronSourceAd();
            case 'fallback':
                this.showFallbackAd();
                return true;
            default:
                console.error('Unknown network:', networkName);
                return false;
        }
    }
}

// Initialize and export
window.AdManager = new AdManager();
console.log('✅ AdManager loaded with native + web hybrid support');
console.log('📊 Platform detected:', window.AdManager.platform);
console.log('🎯 Networks status:', window.AdManager.getNetworkStatus());