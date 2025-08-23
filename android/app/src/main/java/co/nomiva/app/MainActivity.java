package co.nomiva.app;

import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

// Unity Ads imports
import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;

public class MainActivity extends BridgeActivity implements IUnityAdsInitializationListener {

    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;

    // TEST MODE CONFIGURATION
    private final boolean TEST_MODE = false; // Set to false to load normal app

    // UNITY ADS IDs
    private final String UNITY_GAME_ID = "5928380"; // Your Unity Game ID (get from Unity Dashboard)
    private final String UNITY_PLACEMENT_ID = "Rewarded_Android"; // Default Unity placement
    private final boolean UNITY_TEST_MODE = true; // Set to false for production
    private boolean unityAdsReady = false;

    // ADMOB AD IDs - Your actual IDs from AdMob Console
    private final String ADMOB_APP_ID = "ca-app-pub-3520802292477979~1613948420";
    private final String REWARDED_AD_ID = "ca-app-pub-3520802292477979/3274498542";
    private final String INTERSTITIAL_AD_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW";

    // TEST AD IDs (Google's official test IDs)
    private final String TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
    private final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    // CONFIGURATION
    private final boolean USE_TEST_ADS = true; // Set to false when publishing to Play Store
    private final boolean ENABLE_INTERSTITIAL = false; // Set to true if you want interstitial ads
    private final boolean ENABLE_UNITY_ADS = true; // Enable Unity Ads

    // Use test or production IDs based on configuration
    private String admobRewardedAdId;
    private String admobInterstitialAdId;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set which ad IDs to use
        admobRewardedAdId = USE_TEST_ADS ? TEST_REWARDED_ID : REWARDED_AD_ID;
        admobInterstitialAdId = USE_TEST_ADS ? TEST_INTERSTITIAL_ID : INTERSTITIAL_AD_ID;

        // Lock to portrait mode
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Setup status bar
        setupStatusBar();

        // Initialize Unity Ads FIRST (highest priority)
        if (ENABLE_UNITY_ADS) {
            initializeUnityAds();
        }

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            Log.d("AdMob", "AdMob initialized. Using " + (USE_TEST_ADS ? "TEST" : "PRODUCTION") + " ads");
            loadRewardedAd();
            if (ENABLE_INTERSTITIAL) {
                loadInterstitialAd();
            }
        });

        // LOAD TEST PAGE IF IN TEST MODE
        if (TEST_MODE) {
            loadTestPage();
        }
    }

    // Initialize Unity Ads
    private void initializeUnityAds() {
        UnityAds.initialize(getApplicationContext(), UNITY_GAME_ID, UNITY_TEST_MODE, this);
        Log.d("UnityAds", "Initializing Unity Ads with Game ID: " + UNITY_GAME_ID);
    }

    // Unity Ads Initialization Callback
    @Override
    public void onInitializationComplete() {
        Log.d("UnityAds", "Unity Ads initialization complete");
        loadUnityAd();
    }

    @Override
    public void onInitializationFailed(UnityAds.UnityAdsInitializationError error, String message) {
        Log.e("UnityAds", "Unity Ads initialization failed: " + error + " - " + message);
        unityAdsReady = false;
    }

    // Load Unity Ad
    private void loadUnityAd() {
        UnityAds.load(UNITY_PLACEMENT_ID, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                Log.d("UnityAds", "Unity Ad loaded: " + placementId);
                unityAdsReady = true;

                // Notify JavaScript
                getBridge().getWebView().evaluateJavascript(
                        "console.log('🎮 Unity Ad loaded successfully!');",
                        null
                );
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                Log.e("UnityAds", "Unity Ad failed to load: " + error + " - " + message);
                unityAdsReady = false;

                // Try loading again after 30 seconds
                getBridge().getWebView().postDelayed(() -> loadUnityAd(), 30000);
            }
        });
    }

    // Method to load the test page
    private void loadTestPage() {
        // Wait for WebView to be ready, then load test page
        getBridge().getWebView().postDelayed(() -> {
            getBridge().getWebView().loadUrl("file:///android_asset/public/test-ads.html");
            Log.d("MainActivity", "Loading test ads page");
        }, 1000);
    }

    // Method to load interstitial ads
    private void loadInterstitialAd() {
        if (!ENABLE_INTERSTITIAL) return;

        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialAdId, adRequest, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialAd = ad;
                Log.d("AdMob", "Interstitial ad loaded");

                // Set fullscreen callback
                interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        Log.d("AdMob", "Interstitial ad dismissed");
                        loadInterstitialAd(); // Load next ad
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                        Log.e("AdMob", "Interstitial ad failed to show: " + adError.getMessage());
                        interstitialAd = null;
                        loadInterstitialAd();
                    }
                });
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                Log.e("AdMob", "Interstitial ad failed to load: " + loadAdError.getMessage());
                interstitialAd = null;
                // Retry after 60 seconds
                getBridge().getWebView().postDelayed(() -> loadInterstitialAd(), 60000);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();

        // Inject JavaScript interface when WebView is definitely ready
        getBridge().getWebView().addJavascriptInterface(new AdInterface(), "AndroidAds");

        // Test injection with better logging
        getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                        "  console.log('🔍 Checking for AndroidAds interface...');" +
                        "  setTimeout(function() {" +
                        "    if (window.AndroidAds) {" +
                        "      console.log('✅ AndroidAds is available!');" +
                        "      console.log('Testing isReady:', window.AndroidAds.isReady());" +
                        "      console.log('Unity Ads ready:', window.AndroidAds.isUnityReady());" +
                        "      // Auto-hide status bar if logged in" +
                        "      if (window.authManager && window.authManager.isAuthenticated()) {" +
                        "        window.AndroidAds.hideStatusBar();" +
                        "        document.body.classList.add('status-bar-hidden');" +
                        "      }" +
                        "    } else {" +
                        "      console.log('❌ AndroidAds not found');" +
                        "    }" +
                        "  }, 500);" +
                        "})();",
                null
        );
    }

    private void setupStatusBar() {
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Hide status bar completely for ALL users (both logged in and out)
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // For newer Android versions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().getInsetsController().hide(
                    android.view.WindowInsets.Type.statusBars()
            );
        }

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void loadRewardedAd() {
        AdRequest adRequest = new AdRequest.Builder().build();

        RewardedAd.load(this, admobRewardedAdId, adRequest, new RewardedAdLoadCallback() {
            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                rewardedAd = null;
                // Log the error for debugging
                getBridge().getWebView().evaluateJavascript(
                        "console.log('❌ AdMob ad failed to load: " + loadAdError.getMessage() + "');",
                        null
                );
                // Retry loading after 30 seconds
                getBridge().getWebView().postDelayed(() -> loadRewardedAd(), 30000);
            }

            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedAd = ad;
                // Log success
                getBridge().getWebView().evaluateJavascript(
                        "console.log('✅ AdMob ad loaded successfully!');" +
                                "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdLoaded(); }",
                        null
                );
            }
        });
    }

    // JavaScript Interface for Ads
    public class AdInterface {

        // WATERFALL STRATEGY: Try Unity first, then AdMob
        @JavascriptInterface
        public void showRewardedAd() {
            runOnUiThread(() -> {
                // Try Unity Ads first (highest paying)
                if (ENABLE_UNITY_ADS && unityAdsReady) {
                    showUnityRewardedAd();
                }
                // Fallback to AdMob
                else if (rewardedAd != null) {
                    showAdMobRewardedAd();
                }
                // No ads available
                else {
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('⚠️ No ads available - showing fallback');" +
                                    "if(window.AdManagerAndroidCallbacks) { " +
                                    "window.AdManagerAndroidCallbacks.onAdFailed('No ads available'); }",
                            null
                    );
                    // Try loading both again
                    if (ENABLE_UNITY_ADS) loadUnityAd();
                    loadRewardedAd();
                }
            });
        }

        // Show Unity Rewarded Ad
        private void showUnityRewardedAd() {
            Log.d("UnityAds", "Showing Unity rewarded ad");

            UnityAds.show(MainActivity.this, UNITY_PLACEMENT_ID, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                @Override
                public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                    Log.e("UnityAds", "Unity Ad show failed: " + error + " - " + message);
                    unityAdsReady = false;

                    // Fallback to AdMob
                    if (rewardedAd != null) {
                        showAdMobRewardedAd();
                    }

                    // Reload Unity ad for next time
                    loadUnityAd();
                }

                @Override
                public void onUnityAdsShowStart(String placementId) {
                    Log.d("UnityAds", "Unity Ad started: " + placementId);
                }

                @Override
                public void onUnityAdsShowClick(String placementId) {
                    Log.d("UnityAds", "Unity Ad clicked: " + placementId);
                }

                @Override
                public void onUnityAdsShowComplete(String placementId, UnityAds.UnityAdsShowCompletionState state) {
                    Log.d("UnityAds", "Unity Ad completed: " + placementId + " - State: " + state);

                    if (state == UnityAds.UnityAdsShowCompletionState.COMPLETED) {
                        // User earned reward
                        getBridge().getWebView().evaluateJavascript(
                                "console.log('🎮 Unity Ad completed - User earned reward!');" +
                                        "if(window.AdManagerAndroidCallbacks) { " +
                                        "window.AdManagerAndroidCallbacks.onAdCompleted(); }",
                                null
                        );
                    } else {
                        // User skipped
                        getBridge().getWebView().evaluateJavascript(
                                "console.log('⏭️ Unity Ad skipped');" +
                                        "if(window.AdManagerAndroidCallbacks) { " +
                                        "window.AdManagerAndroidCallbacks.onAdSkipped(); }",
                                null
                        );
                    }

                    unityAdsReady = false;
                    // Load next Unity ad
                    loadUnityAd();
                }
            });
        }

        // Show AdMob Rewarded Ad
        private void showAdMobRewardedAd() {
            rewardedAd.show(MainActivity.this, rewardItem -> {
                // User earned reward - notify JavaScript
                getBridge().getWebView().evaluateJavascript(
                        "console.log('💰 AdMob Ad completed - User earned reward!');" +
                                "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdCompleted(); }",
                        null
                );
                // Load next ad
                loadRewardedAd();
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            // Check if ANY ad is ready (Unity or AdMob)
            boolean ready = (ENABLE_UNITY_ADS && unityAdsReady) || (rewardedAd != null);
            // Log the status
            runOnUiThread(() -> {
                getBridge().getWebView().evaluateJavascript(
                        "console.log('Ad ready status - Unity: " + unityAdsReady + ", AdMob: " + (rewardedAd != null) + "');",
                        null
                );
            });
            return ready;
        }

        @JavascriptInterface
        public boolean isUnityReady() {
            return ENABLE_UNITY_ADS && unityAdsReady;
        }

        @JavascriptInterface
        public boolean isAdMobReady() {
            return rewardedAd != null;
        }

        // Test Unity Ad separately
        @JavascriptInterface
        public void showUnityAdOnly() {
            runOnUiThread(() -> {
                if (ENABLE_UNITY_ADS && unityAdsReady) {
                    showUnityRewardedAd();
                } else {
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('❌ Unity Ad not ready');",
                            null
                    );
                }
            });
        }

        // Test AdMob Ad separately
        @JavascriptInterface
        public void showAdMobAdOnly() {
            runOnUiThread(() -> {
                if (rewardedAd != null) {
                    showAdMobRewardedAd();
                } else {
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('❌ AdMob Ad not ready');",
                            null
                    );
                }
            });
        }

        @JavascriptInterface
        public void showInterstitialAd() {
            if (!ENABLE_INTERSTITIAL) {
                Log.w("AdMob", "Interstitial ads are disabled");
                return;
            }

            runOnUiThread(() -> {
                if (interstitialAd != null) {
                    Log.d("AdMob", "Showing interstitial ad");
                    interstitialAd.show(MainActivity.this);
                } else {
                    Log.w("AdMob", "Interstitial ad not ready");
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('❌ Interstitial ad not available');",
                            null
                    );
                }
            });
        }

        @JavascriptInterface
        public boolean isInterstitialReady() {
            return ENABLE_INTERSTITIAL && interstitialAd != null;
        }

        @JavascriptInterface
        public void hideStatusBar() {
            runOnUiThread(() -> {
                // Hide status bar completely
                getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_FULLSCREEN,
                        WindowManager.LayoutParams.FLAG_FULLSCREEN
                );

                // For newer Android versions
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    getWindow().getInsetsController().hide(
                            android.view.WindowInsets.Type.statusBars()
                    );
                }
            });
        }

        @JavascriptInterface
        public void showStatusBar() {
            runOnUiThread(() -> {
                // Show status bar again
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

                // Re-apply translucent status bar
                setupStatusBar();
            });
        }
    }
}