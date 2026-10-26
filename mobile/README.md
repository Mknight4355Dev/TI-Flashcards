# Android version

The PC app stays in the repository root. Run `npm start` there as before; it does not use Capacitor or any mobile dependencies.

This folder contains an independent copy of the interface in `src/`. Both versions use the deck JSON files in the repository root. `npm run build` copies those files into the APK's web assets, so studying works offline without the PC server. Changes to the web interface are not automatically applied to this mobile copy.

## Build tools

Install Node.js 22 or newer and Android Studio 2025.2.1 or newer. In Android Studio, install Android SDK Platform 36 and the SDK build tools recommended by the generated project. Use Android Studio's bundled JDK for Gradle.

Official setup: https://capacitorjs.com/docs/getting-started/environment-setup

## First setup

From this folder:

```powershell
npm install
npm run android:add
npm run android:open
```

If `android/` already exists, skip `android:add` and use `npm run sync` instead. Let Android Studio complete Gradle sync and resolve any missing SDK components. Android Studio creates the machine-specific `android/local.properties` file with your SDK location.

## Build a sideloadable APK

```powershell
npm run apk
```

This rebuilds web assets, syncs Capacitor, and runs Gradle's `assembleDebug`. The result is `android/app/build/outputs/apk/debug/app-debug.apk`. This Capacitor project requires JDK 21 or newer. The APK script checks Java before starting Gradle.

For command-line builds, select Android Studio's bundled JDK in the same PowerShell terminal:

```powershell
# Adjust this path if Android Studio is installed elsewhere.
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
& "$env:JAVA_HOME\bin\java.exe" -version
npm run apk
```

If that directory does not exist, install the Android Studio version listed above or a standalone JDK 21 and use its installation directory for `JAVA_HOME`. Java 8 causes dependency resolution to fail; Java 11 or 17 still cannot compile this project's Java 21 sources. In Android Studio, select the same JDK under **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**.

Alternatively, run `npm run sync`, open Android Studio, and use its Build menu to generate an APK. Transfer the APK to your phone and open it; enable installation from that source when Android asks. No Play Store account is required.

If Gradle reports **SDK location not found**, open **Tools > SDK Manager** in Android Studio. Install **Android SDK Platform 36**, **Android SDK Build-Tools**, and **Android SDK Platform-Tools**, and copy the **Android SDK Location** shown there. From this folder, set that location before building:

```powershell
# Replace this with the actual Android SDK Location from SDK Manager.
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
if (!(Test-Path "$env:ANDROID_HOME\platforms\android-36\android.jar")) {
    throw 'Install Android SDK Platform 36 at the selected SDK location first.'
}
npm run apk
```

For a persistent project setting, create `android/local.properties` with a line such as `sdk.dir=C:/Users/mknig/AppData/Local/Android/Sdk`, using your actual SDK location and forward slashes. This machine-specific file is ignored by Git. The SDK directory is separate from the JDK directory used for `JAVA_HOME`.

For regular use, Android Studio's **Generate Signed App Bundle or APK** flow can create a release APK. Keep the signing key private and retain it for future updates. Increase `versionCode` in `android/app/build.gradle` for updates and use the same application ID and signing key. A release APK cannot update an existing debug installation signed with a different key; uninstall that debug installation first.

## Android behavior and updates

The launcher icon source is `assets/icon.png`. On Windows, run `npm run icons` to regenerate the five launcher density sizes, round icons, and padded adaptive foreground layers. The script also writes `assets/launcher-preview.png` for checking square and circular masks. The original source image stays unchanged. Then run `npm run apk` and install the updated APK to see the new launcher icon on your phone.

- Android Back returns from any question or answer to the deck picker. At the picker, Back closes the app.
- The on-screen Back to decks control remains available.
- The mobile layout uses touch controls and has extra spacing for screen edges.
- After editing a deck or files in `src/`, run `npm run apk` again and install the updated APK.
- To add a deck, update the deck lists in `src/app.js` and `scripts/build.js`. Add a web server route separately if the PC app should also offer it.

Before distributing, test all five decks in airplane mode, question/answer flipping, the last-card restart, Back gestures, rotation, and long answer scrolling on a real phone.

Use **Hide card** beside **Back to decks** to remove the current card from that deck's study rotation. **Reset deck** restores all cards and starts at the first question. Hidden card IDs are saved separately for each deck on this browser or device and restored after reloading or restarting. Reset deck also clears that deck's saved progress. New cards appear automatically and reordering cards preserves progress. Clearing browser/app data or uninstalling the app removes saved progress; progress does not sync between devices. If saving is unavailable, hiding still works for the current session.
