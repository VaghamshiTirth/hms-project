# HMS Frontend

React frontend for the Hospital Management System.

## Dashboards Included

- Admin Dashboard
- Front Desk Dashboard
- Doctor Dashboard
- Patient Dashboard
- Attendant Dashboard

## Main Routes

- `/` Login
- `/dashboard` Admin dashboard
- `/frontdesk-dashboard` Front desk dashboard
- `/doctor-dashboard` Doctor dashboard
- `/patient-dashboard` Patient portal
- `/attendant-dashboard` Family / attendant portal
- `/patient-signup` Patient signup
- `/forgot-password` Forgot password

## Development

```bash
npm install
npm start
```

The frontend runs on:

```text
http://localhost:3000/
```

## Mobile / APK

This frontend is wrapped with Capacitor for Android.

Useful commands:

```bash
npm run build:mobile
npm run cap:sync
npm run android:open
npm run android:run
```

For full Android setup, see [ANDROID_APP_SETUP.md](./ANDROID_APP_SETUP.md).

## Important

If a dashboard opens directly instead of the login page, the previous user role is likely still saved in browser local storage.
