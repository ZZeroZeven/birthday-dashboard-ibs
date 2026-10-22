package com.zzerozeven.birthdaydirectory;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://zzerozeven.github.io/birthday-dashboard-ibs/";
    private FrameLayout root;
    private WebView webView;
    private ProgressBar progress;
    private View errorView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(20, 19, 17));
        getWindow().setNavigationBarColor(Color.rgb(20, 19, 17));
        getWindow().getDecorView().setSystemUiVisibility(0);
        root = new FrameLayout(this);
        setContentView(root);
        createWebView();
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
            if (webView.getUrl() == null) webView.loadUrl(HOME_URL);
        } else {
            webView.loadUrl(HOME_URL);
        }
    }

    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(246, 244, 239));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value >= 100 ? View.GONE : View.VISIBLE);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                return host != null && !host.equals("zzerozeven.github.io");
            }
            @Override public void onPageFinished(WebView view, String url) {
                hideError();
                progress.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
        });
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP);
        root.addView(progress, progressParams);
    }

    private void showError() {
        if (errorView != null) return;
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(28), dp(24), dp(28), dp(24));
        panel.setBackgroundColor(Color.rgb(246, 244, 239));
        TextView title = new TextView(this);
        title.setText("Tidak dapat terhubung");
        title.setTextColor(Color.rgb(40, 41, 35));
        title.setTextSize(22);
        title.setGravity(Gravity.CENTER);
        TextView message = new TextView(this);
        message.setText("Periksa koneksi internet, lalu coba lagi.");
        message.setTextColor(Color.rgb(110, 108, 101));
        message.setTextSize(15);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(10), 0, dp(18));
        Button retry = new Button(this);
        retry.setText("Coba lagi");
        retry.setOnClickListener(v -> {
            hideError();
            webView.reload();
        });
        panel.addView(title);
        panel.addView(message);
        panel.addView(retry);
        errorView = panel;
        root.addView(errorView, new FrameLayout.LayoutParams(-1, -1));
    }

    private void hideError() {
        if (errorView != null) {
            root.removeView(errorView);
            errorView = null;
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
