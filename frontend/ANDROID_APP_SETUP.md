# Android App Setup

This project is now wrapped with Capacitor, so the React site can run as a proper Android app shell.

## Important

The APK loads the frontend from local app assets, but your Django backend still needs to be reachable from the Android phone.

Do not use this for the Android app:

```env
REACT_APP_NATIVE_API_URL=http://127.0.0.1:8000/api/
```

Use a phone-reachable URL instead, for example:

```env
REACT_APP_NATIVE_API_URL=http://192.168.1.5:8000/api/
```

For hosted production:

```env
REACT_APP_API_URL=https://your-domain.com/api/
REACT_APP_NATIVE_API_URL=https://your-domain.com/api/
```

## Local Android Build Flow

1. Create `frontend/.env.production` and set:

```env
REACT_APP_API_URL=https://your-domain.com/api/
REACT_APP_NATIVE_API_URL=https://your-domain.com/api/
```

For local phone testing, use your laptop IP in `REACT_APP_NATIVE_API_URL`.

2. In Django backend, allow your laptop IP or production domain:

```env
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,testserver,192.168.1.5,your-domain.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://your-domain.com
```

3. Build and sync web assets:

```bash
npm run build:mobile
```

4. Open the Android project:

```bash
npm run android:open
```

5. In Android Studio:
   - wait for Gradle sync
   - connect Android device or start emulator
   - choose `Build > Build Bundle(s) / APK(s) > Build APK(s)`

## Useful Commands

```bash
npm run cap:sync
npm run android:run
```

## Current Android Wrapper

- App ID: `com.hms.portal`
- App name: `HMS Care`
- Android project folder: `frontend/android`
