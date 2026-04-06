from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Appointment, Doctor, FamilyAccess, Patient, PatientSignupOTP, User


class RoutingSmokeTests(TestCase):
    def test_backend_root_returns_status_ok(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["api_root"], "/api/")

    def test_api_root_returns_status_ok(self):
        response = self.client.get("/api/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())


class PatientSelfBookingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create(
            name="Patient User",
            email="patient@example.com",
            mobile_number="9999999999",
            password="secret",
            role="patient",
        )
        self.patient = Patient.objects.create(user=self.patient_user, age=28, history="Allergy")

        self.doctor_user = User.objects.create(
            name="Doctor User",
            email="doctor@example.com",
            mobile_number="8888888888",
            password="secret",
            role="doctor",
        )
        self.doctor = Doctor.objects.create(user=self.doctor_user, specialization="Cardiology")

        self.other_patient_user = User.objects.create(
            name="Other Patient",
            email="other@example.com",
            mobile_number="7777777777",
            password="secret",
            role="patient",
        )
        self.other_patient = Patient.objects.create(user=self.other_patient_user, age=35, history="Diabetes")

        self.client.credentials(HTTP_X_USER_ID=str(self.patient_user.id))
        self.tomorrow = timezone.localdate() + timedelta(days=1)

    def test_patient_can_book_own_appointment(self):
        response = self.client.post(
            "/api/appointments/",
            {
                "patient": self.other_patient.id,
                "doctor": self.doctor.id,
                "date": self.tomorrow.isoformat(),
                "time_slot": "10:30",
                "status": "Completed",
                "queue_status": "completed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        appointment = Appointment.objects.get()
        self.assertEqual(appointment.patient_id, self.patient.id)
        self.assertEqual(appointment.status, "Pending")
        self.assertEqual(appointment.queue_status, "waiting")

    def test_patient_cannot_book_taken_slot(self):
        Appointment.objects.create(
            patient=self.other_patient,
            doctor=self.doctor,
            date=self.tomorrow,
            time_slot="10:30",
            status="Confirmed",
            queue_status="waiting",
        )

        response = self.client.post(
            "/api/appointments/",
            {
                "doctor": self.doctor.id,
                "date": self.tomorrow.isoformat(),
                "time_slot": "10:30",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"], "This doctor time slot is already booked.")

    def test_patient_can_view_available_slots_for_doctor(self):
        Appointment.objects.create(
            patient=self.other_patient,
            doctor=self.doctor,
            date=self.tomorrow,
            time_slot="09:00",
            status="Confirmed",
            queue_status="waiting",
        )

        response = self.client.get(f"/api/doctors/{self.doctor.id}/available-slots/?date={self.tomorrow.isoformat()}")

        self.assertEqual(response.status_code, 200)
        self.assertIn("09:30", response.json()["available_slots"])
        self.assertIn("09:00", response.json()["booked_slots"])

    def test_patient_can_reschedule_own_appointment(self):
        appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            date=self.tomorrow,
            time_slot="09:00",
            status="Confirmed",
            queue_status="checked_in",
        )

        response = self.client.put(
            f"/api/appointments/{appointment.id}/",
            {
                "doctor": self.doctor.id,
                "date": self.tomorrow.isoformat(),
                "time_slot": "09:30",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.time_slot.strftime("%H:%M"), "09:30")
        self.assertEqual(appointment.status, "Pending")
        self.assertEqual(appointment.queue_status, "waiting")

    def test_patient_can_cancel_own_appointment(self):
        appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            date=self.tomorrow,
            time_slot="11:00",
            status="Pending",
            queue_status="waiting",
        )

        response = self.client.delete(f"/api/appointments/{appointment.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Appointment.objects.filter(id=appointment.id).exists())


class PatientSignupOtpTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_patient_signup_otp_creates_pending_signup(self):
        response = self.client.post(
            "/api/patient-signup/",
            {
                "name": "New Patient",
                "mobile_number": "9123456789",
                "email": "newpatient@example.com",
                "password": "safe-password",
                "age": 30,
                "history": "Asthma",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(PatientSignupOTP.objects.filter(mobile_number="9123456789", is_used=False).exists())

    def test_patient_signup_verification_creates_user_and_profile(self):
        otp = PatientSignupOTP.objects.create(
            name="Verified Patient",
            email="verified@example.com",
            mobile_number="9012345678",
            password="hashed-password",
            age=31,
            history="Healthy",
            code="123456",
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.post(
            "/api/patient-signup/verify/",
            {
                "mobile_number": otp.mobile_number,
                "code": otp.code,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(mobile_number=otp.mobile_number, role="patient").exists())
        self.assertTrue(Patient.objects.filter(user__mobile_number=otp.mobile_number).exists())


class FrontDeskPatientPasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.frontdesk_user = User.objects.create(
            name="Desk User",
            email="desk@example.com",
            mobile_number="9876543210",
            password="secret",
            role="frontdesk",
        )
        self.patient_user = User.objects.create(
            name="Darshak",
            email="darshak@example.com",
            mobile_number="9123456789",
            password="old-secret",
            role="patient",
        )
        self.client.credentials(HTTP_X_USER_ID=str(self.frontdesk_user.id))

    def test_frontdesk_can_reset_patient_password(self):
        response = self.client.post(f"/api/patient-users/{self.patient_user.id}/reset-password/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("generated_password", response.json())


class BillingAppointmentRuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.frontdesk_user = User.objects.create(
            name="Desk User",
            email="desk2@example.com",
            mobile_number="9000000000",
            password="secret",
            role="frontdesk",
        )
        patient_user = User.objects.create(
            name="Billing Patient",
            email="bill@example.com",
            mobile_number="9111111111",
            password="secret",
            role="patient",
        )
        self.patient = Patient.objects.create(user=patient_user, age=25, history="None")
        doctor_user = User.objects.create(
            name="Billing Doctor",
            email="billdoctor@example.com",
            mobile_number="9222222222",
            password="secret",
            role="doctor",
        )
        self.doctor = Doctor.objects.create(user=doctor_user, specialization="General")
        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            date=timezone.localdate() + timedelta(days=1),
            time_slot="10:00",
            status="Confirmed",
            queue_status="waiting",
        )
        self.second_appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            date=timezone.localdate() + timedelta(days=2),
            time_slot="11:00",
            status="Confirmed",
            queue_status="waiting",
        )
        self.client.credentials(HTTP_X_USER_ID=str(self.frontdesk_user.id))

    def test_same_appointment_cannot_be_billed_twice(self):
        first_response = self.client.post(
            "/api/billing/",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "amount": "500",
                "status": "Paid",
                "notes": "Consultation",
            },
            format="json",
        )
        second_response = self.client.post(
            "/api/billing/",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "amount": "500",
                "status": "Paid",
                "notes": "Duplicate",
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(second_response.json()["error"], "Bill already exists for this appointment.")

    def test_same_patient_second_appointment_can_be_billed(self):
        first_response = self.client.post(
            "/api/billing/",
            {
                "patient": self.patient.id,
                "appointment": self.appointment.id,
                "amount": "500",
                "status": "Paid",
                "notes": "First visit",
            },
            format="json",
        )
        second_response = self.client.post(
            "/api/billing/",
            {
                "patient": self.patient.id,
                "appointment": self.second_appointment.id,
                "amount": "700",
                "status": "Paid",
                "notes": "Second visit",
            },
            format="json",
        )

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)


class PatientPermanentDeleteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.frontdesk_user = User.objects.create(
            name="Desk Delete",
            email="deskdelete@example.com",
            mobile_number="9333333333",
            password="secret",
            role="frontdesk",
        )
        self.patient_user = User.objects.create(
            name="Delete Me",
            email="deleteme@example.com",
            mobile_number="9444444444",
            password="secret",
            role="patient",
        )
        self.patient = Patient.objects.create(user=self.patient_user, age=29, history="Remove")
        self.client.credentials(HTTP_X_USER_ID=str(self.frontdesk_user.id))

    def test_deleting_patient_profile_removes_linked_user(self):
        response = self.client.delete(f"/api/patients/{self.patient.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Patient.objects.filter(id=self.patient.id).exists())
        self.assertFalse(User.objects.filter(id=self.patient_user.id).exists())


class FamilyAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.frontdesk_user = User.objects.create(
            name="Front Desk",
            email="familydesk@example.com",
            mobile_number="9555555555",
            password="secret",
            role="frontdesk",
        )
        self.attendant_user = User.objects.create(
            name="Parent User",
            email="parent@example.com",
            mobile_number="9666666666",
            password="secret",
            role="attendant",
        )
        patient_user = User.objects.create(
            name="Child Patient",
            email="child@example.com",
            mobile_number="9777777777",
            password="secret",
            role="patient",
        )
        self.patient = Patient.objects.create(user=patient_user, age=12, history="Checkups")
        self.client.credentials(HTTP_X_USER_ID=str(self.frontdesk_user.id))

    def test_frontdesk_can_create_family_access(self):
        response = self.client.post(
            "/api/family-access/",
            {
                "attendant_user": self.attendant_user.id,
                "patient": self.patient.id,
                "relation": "Father",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(FamilyAccess.objects.filter(attendant_user=self.attendant_user, patient=self.patient).exists())

    def test_attendant_can_create_family_member_without_mobile(self):
        self.client.credentials(HTTP_X_USER_ID=str(self.attendant_user.id))

        response = self.client.post(
            "/api/attendant-family-members/",
            {
                "name": "Second Child",
                "age": 8,
                "history": "Seasonal cold",
                "relation": "daughter",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        created_patient = Patient.objects.select_related("user").get(id=response.json()["patient_id"])
        self.assertEqual(created_patient.user.role, "patient")
        self.assertIsNone(created_patient.user.mobile_number)
        self.assertTrue(response.json()["uses_family_account"])
        self.assertEqual(response.json()["shared_mobile_number"], self.attendant_user.mobile_number)
        self.assertTrue(FamilyAccess.objects.filter(attendant_user=self.attendant_user, patient=created_patient, relation="daughter").exists())

    def test_frontdesk_patient_list_includes_attendant_as_patient_profile(self):
        response = self.client.get("/api/patients/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Patient.objects.filter(user=self.attendant_user).exists())
        response_names = [item["user_name"] for item in response.json()]
        self.assertIn(self.attendant_user.name, response_names)

    def test_patient_can_grant_family_access_after_registration(self):
        self.client.credentials(HTTP_X_USER_ID=str(self.patient.user_id))

        response = self.client.post(
            "/api/family-access/",
            {
                "attendant_name": "Mother User",
                "mobile_number": "9888888888",
                "relation": "mother",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("generated_password", response.json())
        created_attendant = User.objects.get(mobile_number="9888888888")
        self.assertEqual(created_attendant.role, "attendant")
        self.assertTrue(FamilyAccess.objects.filter(attendant_user=created_attendant, patient=self.patient, relation="mother").exists())
