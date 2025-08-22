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

public class MainActivity extends BridgeActivity {

    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;

    // TEST MODE CONFIGURATION
    private final boolean TEST_MODE = true; // Set to false to load normal app

    // PRODUCTION AD IDs - Your actual IDs from AdMob Console
    private final String ADMOB_APP_ID = "ca-app-pub-3520802292477979~1613948420"; // Your App ID
    private final String REWARDED_AD_ID = "ca-app-pub-3520802292477979/3274498542"; // Your Rewarded Ad Unit ID
    private final String INTERSTITIAL_AD_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW"; // Your Interstitial Ad Unit ID (optional)

    // TEST AD IDs (Google's official test IDs)
    private final String TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
    private final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    // CONFIGURATION
    private final boolean USE_TEST_ADS = true; // Set to false when publishing to Play Store
    private final boolean ENABLE_INTERSTITIAL = false; // Set to true if you want interstitial ads

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
        getBridge().getWebView().addJavascriptInterface(new AdMobInterface(), "AndroidAds");

        // Test injection with better logging
        getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                        "  console.log('🔍 Checking for AndroidAds interface...');" +
                        "  setTimeout(function() {" +
                        "    if (window.AndroidAds) {" +
                        "      console.log('✅ AndroidAds is available!');" +
                        "      console.log('Testing isReady:', window.AndroidAds.isReady());" +
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
                        "console.log('❌ Ad failed to load: " + loadAdError.getMessage() + "');",
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
                        "console.log('✅ Ad loaded successfully!');" +
                                "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdLoaded(); }",
                        null
                );
            }
        });
    }

    // JavaScript Interface for AdMob
    public class AdMobInterface {
        @JavascriptInterface
        public void showRewardedAd() {
            runOnUiThread(() -> {
                if (rewardedAd != null) {
                    rewardedAd.show(MainActivity.this, rewardItem -> {
                        // User earned reward - notify JavaScript
                        getBridge().getWebView().evaluateJavascript(
                                "console.log('🎉 User earned reward!');" +
                                        "if(window.AdManagerAndroidCallbacks) { " +
                                        "window.AdManagerAndroidCallbacks.onAdCompleted(); }",
                                null
                        );
                        // Load next ad
                        loadRewardedAd();
                    });
                } else {
                    // No ad available - notify JavaScript
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('⚠️ No ad available');" +
                                    "if(window.AdManagerAndroidCallbacks) { " +
                                    "window.AdManagerAndroidCallbacks.onAdFailed('No ad available'); }",
                            null
                    );
                    // Try loading again
                    loadRewardedAd();
                }
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            boolean ready = rewardedAd != null;
            // Log the status
            runOnUiThread(() -> {
                getBridge().getWebView().evaluateJavascript(
                        "console.log('Ad ready status: " + ready + "');",
                        null
                );
            });
            return ready;
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