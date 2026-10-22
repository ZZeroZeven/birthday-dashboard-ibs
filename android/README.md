# Birthday Directory for Android

This Android Studio project opens the published GitHub Pages site in a full-screen WebView. It hides browser chrome, preserves WebView storage for the site's login session and theme, supports system back navigation, and shows a simple retry view when the site cannot load.

## Build an APK

Open the `android` folder in Android Studio and build the `app` debug variant, or run:

```sh
gradle --no-daemon -p android assembleDebug
```

The APK is created at `app/build/outputs/apk/debug/app-debug.apk`.

GitHub Actions also builds this APK on changes to `android/**`. Download the `birthday-directory-android` artifact from the completed workflow run.
