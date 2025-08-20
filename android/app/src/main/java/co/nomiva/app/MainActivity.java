package co.nomiva.app;

import android.content.pm.ActivityInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;

import androidx.annotation.NonNull;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

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
        initializeAds();
    }

    private void setupStatusBar() {
        // Enable edge-to-edge display
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Translucent dark status bar
            getWindow().setStatusBarColor(Color.parseColor("#66000000"));
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        }

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void initializeAds() {
        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {
            // AdMob initialized, load first ad
            loadRewardedAd();

            // Setup JavaScript interface after WebView is ready
            getBridge().getWebView().postDelayed(this::setupJavaScriptInterface, 1000);
        });
    }

    private void setupJavaScriptInterface() {
        // Add JavaScript interface for AdMob
        getBridge().getWebView().addJavascriptInterface(new AdMobInterface(), "AndroidAds");

        // Notify JavaScript that interface is ready
        getBridge().getWebView().evaluateJavascript(
                "console.log('✅ Android AdMob interface ready'); " +
                        "if(window.AdManager) { window.AdManager.platform = 'android-webview'; }",
                null
        );
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
    }
}