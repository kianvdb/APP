package co.nomiva.app;

import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

public class MainActivity extends BridgeActivity {

    private RewardedAd rewardedAd;
    private final String admobRewardedAdId = "ca-app-pub-3940256099942544/5224354917"; // Test ID - Change to your real ID

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Lock to portrait mode
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);

        // Setup status bar
        setupStatusBar();

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            loadRewardedAd();
        });
    }

    @Override
    public void onResume() {
        super.onResume();

        // Inject JavaScript interface when WebView is definitely ready
        getBridge().getWebView().addJavascriptInterface(new AdMobInterface(), "AndroidAds");

        // Test injection
        getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                        "  setTimeout(function() {" +
                        "    if (window.AndroidAds) {" +
                        "      console.log('✅ AndroidAds is available!');" +
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
                // Retry loading after 30 seconds
                getBridge().getWebView().postDelayed(() -> loadRewardedAd(), 30000);
            }

            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedAd = ad;
                // Notify JavaScript that ad is ready
                getBridge().getWebView().evaluateJavascript(
                        "if(window.AdManagerAndroidCallbacks) { " +
                                "window.AdManagerAndroidCallbacks.onAdLoaded(); }",
                        null
                );
            }
        });
    }

    // JavaScript Interface for AdMob
    // JavaScript Interface for AdMob
    public class AdMobInterface {
        @JavascriptInterface
        public void showRewardedAd() {
            runOnUiThread(() -> {
                if (rewardedAd != null) {
                    rewardedAd.show(MainActivity.this, rewardItem -> {
                        // User earned reward - notify JavaScript
                        getBridge().getWebView().evaluateJavascript(
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
                            "if(window.AdManagerAndroidCallbacks) { " +
                                    "window.AdManagerAndroidCallbacks.onAdFailed('No ad available'); }",
                            null
                    );
                }
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            return rewardedAd != null;
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