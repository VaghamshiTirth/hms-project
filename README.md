# HMS Project

Hospital Management System (HMS) built with:

- React frontend
- Django backend API
- Capacitor Android wrapper for APK generation

When someone opens this repository on GitHub, this README gives a quick overview of every dashboard, the main modules, and the Android app flow.

## Main User Dashboards

### 1. Admin Dashboard
- Route: `/dashboard`
- Purpose: hospital-wide overview
- Features:
  - patient, doctor, appointment, and billing summary
  - daily / monthly / overall analytics
  - doctor workload view
  - recent billing activity and bill details

### 2. Front Desk Dashboard
- Route: `/frontdesk-dashboard`
- Purpose: reception and queue management
- Features:
  - waiting, checked-in, in-consultation, and completed queues
  - patient check-in
  - send patient to doctor
  - mark no-show
  - pending billing follow-up
  - live date and time

### 3. Doctor Dashboard
- Route: `/doctor-dashboard`
- Purpose: doctor workflow and clinical actions
- Features:
  - today appointments and visit progress
  - start / complete visit
  - create prescriptions
  - admit patient
  - update room, care notes, and medicine notes
  - see admitted patients list

### 4. Patient Dashboard
- Route: `/patient-dashboard`
- Purpose: self-service patient portal
- Features:
  - book, reschedule, cancel, and repeat appointments
  - doctor slot selection
  - profile update
  - billing and invoice access
  - prescriptions
  - medical records
  - family/guardian access creation

### 5. Attendant Dashboard
- Route: `/attendant-dashboard`
- Purpose: family member / guardian portal
- Features:
  - manage linked family patients
  - create patient without separate mobile number
  - see appointments, bills, prescriptions, and records
  - view patient relationship mapping

## Other Screens / Modules

- Login: `/`
- Patient Signup: `/patient-signup`
- Forgot Password: `/forgot-password`
- Activity Logs: `/activity-logs`
- Admission Desk related flow: `/admission-desk`
- Patient management: `/patients`
- Appointment page: `/appointment` and `/appointments`
- Billing page: `/billing`

## Project Structure

```text
hms-project/
|-- backend/    Django API, models, serializers, views, routes
|-- frontend/   React app, dashboards, Capacitor Android wrapper
```

## Tech Stack

- Frontend: React, React Router, Axios, Tailwind CSS
- Backend: Django
- Mobile App: Capacitor Android

## Run Locally

### Backend

```bash
cd backend
python manage.py runserver
```

Backend default:

```text
http://127.0.0.1:8000/
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend default:

```text
http://localhost:3000/
```

## Why Front Desk Opens Sometimes

If the app directly opens a dashboard like front desk, it usually means the previous login session is still stored in browser `localStorage`.

This project redirects users based on saved role:

- `admin` -> `/dashboard`
- `frontdesk` -> `/frontdesk-dashboard`
- `doctor` -> `/doctor-dashboard`
- `patient` -> `/patient-dashboard`
- `attendant` -> `/attendant-dashboard`

To go back to login, log out from the current dashboard or clear browser local storage.

## Android APK / Mobile App

This project also supports Android app packaging through Capacitor.

### Current mobile setup

- App name: `HMS Care`
- App ID: `com.hms.portal`
- Android project folder: `frontend/android`

### APK build flow

```bash
cd frontend
npm install
npm run build:mobile
npm run android:open
```

Then in Android Studio:

1. Wait for Gradle sync
2. Connect device or open emulator
3. Use `Build > Build Bundle(s) / APK(s) > Build APK(s)`

### Important for APK

The APK can load the frontend locally, but the Django backend must still be reachable from the phone or emulator.

Use a reachable backend URL such as:

```env
REACT_APP_NATIVE_API_URL=http://192.168.1.5:8000/api/
```

Do not use `127.0.0.1` inside the phone unless you are using the correct emulator/device mapping.

More setup notes are available in [frontend/ANDROID_APP_SETUP.md](./frontend/ANDROID_APP_SETUP.md).

## Summary

This HMS project is not just one front desk page. It includes:

- admin analytics
- front desk queue handling
- doctor clinical workflow
- patient self-service portal
- family/attendant access
- Android APK support
