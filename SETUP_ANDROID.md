# Android Build Guide

This project is prepared for Android with Capacitor.

## Requirements

- Node.js 20+
- Android Studio
- JDK 17
- Android SDK Platform 35 or the latest stable SDK

## First Build

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

## Generate APK or AAB

1. Open Android Studio.
2. Let Gradle finish syncing.
3. Choose `Build > Generate Signed Bundle / APK`.
4. Select APK for direct installation, or Android App Bundle for Google Play.
5. Create or choose a keystore.
6. Build release.

## Payment Deep Links

Configure your payment provider callback URL to:

```text
https://your-domain.com/payment/callback
```

For native deep links, add your final scheme and host inside Android Studio after the client domain is known.

## Updating Web Code

After every web change:

```bash
npm run build:android
```

Then rebuild the signed APK/AAB from Android Studio.
