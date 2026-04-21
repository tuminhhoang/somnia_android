# Building the Sominia Android APK

## Prerequisites

Install Android Studio and set up:
- Android SDK (API 33+)
- JDK 17
- Set `ANDROID_HOME` environment variable

## Steps

### 1. Install dependencies (from somnia-app/)
```bash
cd somnia-app
npm install
```

### 2. Build debug APK
```bash
cd somnia-app/android
./gradlew assembleDebug
```

APK will be at:
`somnia-app/android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Build release APK

Generate a keystore (first time only):
```bash
keytool -genkey -v -keystore somnia-release.jks \
  -alias somnia -keyalg RSA -keysize 2048 -validity 10000
```

Build:
```bash
cd somnia-app/android
./gradlew assembleRelease \
  -Pandroid.storeFile=../../somnia-release.jks \
  -Pandroid.storePassword=YOUR_PASSWORD \
  -Pandroid.keyAlias=somnia \
  -Pandroid.keyPassword=YOUR_PASSWORD
```

APK will be at:
`somnia-app/android/app/build/outputs/apk/release/app-release.apk`

## SDK Devices Supported

| Device | SDK | BLE UUIDs |
|--------|-----|-----------|
| Health Bracelet (2208A) | blesdk2208a.jar | Service: `fff0`, Write: `fff6`, Notify: `fff7` |
| Smart Ring (X3) | blesdk2301x6 (source) | Service: `fff0`, Write: `fff6`, Notify: `fff7` |

## Features

- **Settings screen**: Scan, connect, and sync both devices
- **Data synced**: Sleep stages, heart rate, HRV, blood oxygen
- Data is emitted as `onDataReceived` events and can be forwarded to backend

## Troubleshooting

**Build error: "Duplicate class"**
Add to `android/app/build.gradle`:
```gradle
android {
    packagingOptions {
        exclude 'META-INF/DEPENDENCIES'
    }
}
```

**Bluetooth permissions denied on Android 12+**
The app requests `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` at runtime. Make sure to accept the permission dialogs.

**Device not found during scan**
- Ensure the device is powered on and not already connected to another phone
- For X3 ring: press and hold the button to put in pairing mode
- For 2208A bracelet: ensure it's charged and screen is active
