package co.nomiva.app;

import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
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

import com.unity3d.ads.IUnityAdsInitializationListener;
import com.unity3d.ads.IUnityAdsLoadListener;
import com.unity3d.ads.IUnityAdsShowListener;
import com.unity3d.ads.UnityAds;
import com.unity3d.ads.UnityAdsShowOptions;

public class MainActivity extends BridgeActivity implements IUnityAdsInitializationListener {

    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;

    // TEST MODE CONFIGURATION
    private final boolean TEST_MODE = false;

    // UNITY ADS IDs
    private final String UNITY_GAME_ID = "5928380";
    private final String UNITY_PLACEMENT_ID = "Rewarded_Android";
    private final boolean UNITY_TEST_MODE = true;
    private boolean unityAdsReady = false;

    // ADMOB AD IDs
    private final String ADMOB_APP_ID = "ca-app-pub-3520802292477979~1613948420";
    private final String REWARDED_AD_ID = "ca-app-pub-3520802292477979/3274498542";
    private final String INTERSTITIAL_AD_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW";

    // TEST AD IDs
    private final String TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
    private final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

    // CONFIGURATION
    private final boolean USE_TEST_ADS = true;
    private final boolean ENABLE_INTERSTITIAL = false;
    private final boolean ENABLE_UNITY_ADS = true;

    private String admobRewardedAdId;
    private String admobInterstitialAdId;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        admobRewardedAdId = USE_TEST_ADS ? TEST_REWARDED_ID : REWARDED_AD_ID;
        admobInterstitialAdId = USE_TEST_ADS ? TEST_INTERSTITIAL_ID : INTERSTITIAL_AD_ID;

        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        setupStatusBar();

        if (ENABLE_UNITY_ADS) {
            initializeUnityAds();
        }

        MobileAds.initialize(this, initializationStatus -> {
            Log.d("AdMob", "AdMob initialized. Using " + (USE_TEST_ADS ? "TEST" : "PRODUCTION") + " ads");
            loadRewardedAd();
            if (ENABLE_INTERSTITIAL) {
                loadInterstitialAd();
            }
        });

        if (TEST_MODE) {
            loadTestPage();
        }
    }

    private void initializeUnityAds() {
        UnityAds.initialize(getApplicationContext(), UNITY_GAME_ID, UNITY_TEST_MODE, this);
        Log.d("UnityAds", "Initializing Unity Ads with Game ID: " + UNITY_GAME_ID);
    }

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

    private void loadUnityAd() {
        UnityAds.load(UNITY_PLACEMENT_ID, new IUnityAdsLoadListener() {
            @Override
            public void onUnityAdsAdLoaded(String placementId) {
                Log.d("UnityAds", "Unity Ad loaded: " + placementId);
                unityAdsReady = true;
                getBridge().getWebView().evaluateJavascript(
                        "console.log('🎮 Unity Ad loaded successfully!');",
                        null
                );
            }

            @Override
            public void onUnityAdsFailedToLoad(String placementId, UnityAds.UnityAdsLoadError error, String message) {
                Log.e("UnityAds", "Unity Ad failed to load: " + error + " - " + message);
                unityAdsReady = false;
                getBridge().getWebView().postDelayed(() -> loadUnityAd(), 30000);
            }
        });
    }

    private void loadTestPage() {
        getBridge().getWebView().postDelayed(() -> {
            getBridge().getWebView().loadUrl("file:///android_asset/public/test-ads.html");
            Log.d("MainActivity", "Loading test ads page");
        }, 1000);
    }

    private void loadInterstitialAd() {
        if (!ENABLE_INTERSTITIAL) return;

        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, admobInterstitialAdId, adRequest, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialAd = ad;
                Log.d("AdMob", "Interstitial ad loaded");

                interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        Log.d("AdMob", "Interstitial ad dismissed");
                        loadInterstitialAd();
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
                getBridge().getWebView().postDelayed(() -> loadInterstitialAd(), 60000);
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        getBridge().getWebView().addJavascriptInterface(new AdInterface(), "AndroidAds");

        getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                        "  console.log('🔍 Checking for AndroidAds interface...');" +
                        "  setTimeout(function() {" +
                        "    if (window.AndroidAds) {" +
                        "      console.log('✅ AndroidAds is available!');" +
                        "      console.log('Testing isReady:', window.AndroidAds.isReady());" +
                        "      console.log('Unity Ads ready:', window.AndroidAds.isUnityReady());" +
                        "    } else {" +
                        "      console.log('❌ AndroidAds not found');" +
                        "    }" +
                        "  }, 500);" +
                        "})();",
                null
        );
    }

    private void setupStatusBar() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().getInsetsController().hide(
                    android.view.WindowInsets.Type.statusBars() |
                            android.view.WindowInsets.Type.navigationBars()
            );
        }

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void loadRewardedAd() {
        AdRequest adRequest = new AdRequest.Builder().build();

        RewardedAd.load(this, admobRewardedAdId, adRequest, new RewardedAdLoadCallback() {
            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                rewardedAd = null;
                getBridge().getWebView().evaluateJavascript(
                        "console.log('❌ AdMob ad failed to load: " + loadAdError.getMessage() + "');",
                        null
                );
                getBridge().getWebView().postDelayed(() -> loadRewardedAd(), 30000);
            }

            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedAd = ad;
                getBridge().getWebView().evaluateJavascript(
                        "console.log('✅ AdMob ad loaded successfully!');" +
                                "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdLoaded(); }",
                        null
                );
            }
        });
    }

    public class AdInterface {

        @JavascriptInterface
        public void showRewardedAd() {
            runOnUiThread(() -> {
                if (ENABLE_UNITY_ADS && unityAdsReady) {
                    showUnityRewardedAd();
                } else if (rewardedAd != null) {
                    showAdMobRewardedAd();
                } else {
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('⚠️ No ads available - showing fallback');" +
                                    "if(window.AdManagerAndroidCallbacks) { " +
                                    "window.AdManagerAndroidCallbacks.onAdFailed('No ads available'); }",
                            null
                    );
                    if (ENABLE_UNITY_ADS) loadUnityAd();
                    loadRewardedAd();
                }
            });
        }

        private void showUnityRewardedAd() {
            Log.d("UnityAds", "Showing Unity rewarded ad");

            UnityAds.show(MainActivity.this, UNITY_PLACEMENT_ID, new UnityAdsShowOptions(), new IUnityAdsShowListener() {
                @Override
                public void onUnityAdsShowFailure(String placementId, UnityAds.UnityAdsShowError error, String message) {
                    Log.e("UnityAds", "Unity Ad show failed: " + error + " - " + message);
                    unityAdsReady = false;
                    if (rewardedAd != null) {
                        showAdMobRewardedAd();
                    }
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
                        getBridge().getWebView().evaluateJavascript(
                                "console.log('🎮 Unity Ad completed - User earned reward!');" +
                                        "if(window.AdManagerAndroidCallbacks) { " +
                                        "window.AdManagerAndroidCallbacks.onAdCompleted(); }",
                                null
                        );
                    } else {
                        getBridge().getWebView().evaluateJavascript(
                                "console.log('⏭️ Unity Ad skipped');" +
                                        "if(window.AdManagerAndroidCallbacks) { " +
                                        "window.AdManagerAndroidCallbacks.onAdSkipped(); }",
                                null
                        );
                    }
                    unityAdsReady = false;
                    loadUnityAd();
                }
            });
        }

        private void showAdMobRewardedAd() {
            rewardedAd.show(MainActivity.this, rewardItem -> {
                getBridge().getWebView().evaluateJavascript(
                        "console.log('💰 AdMob Ad completed - User earned reward!');" +
                                "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdCompleted(); }",
                        null
                );
                loadRewardedAd();
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            return (ENABLE_UNITY_ADS && unityAdsReady) || (rewardedAd != null);
        }

        @JavascriptInterface
        public boolean isUnityReady() {
            return ENABLE_UNITY_ADS && unityAdsReady;
        }

        @JavascriptInterface
        public boolean isAdMobReady() {
            return rewardedAd != null;
        }

        @JavascriptInterface
        public void showUnityAdOnly() {
            runOnUiThread(() -> {
                if (ENABLE_UNITY_ADS && unityAdsReady) {
                    showUnityRewardedAd();
                } else {
                    getBridge().getWebView().evaluateJavascript(
                            "console.log('❌ Unity Ads not ready');",
                            null
                    );
                }
            });
        }

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
                setupStatusBar();
            });
        }

        @JavascriptInterface
        public void showStatusBar() {
            runOnUiThread(() -> {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            });
        }
    }
}