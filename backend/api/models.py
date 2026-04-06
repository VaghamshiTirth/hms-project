from django.db import models
from django.utils import timezone

# User Model
class User(models.Model):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('frontdesk', 'Front Desk'),
        ('doctor', 'Doctor'),
        ('patient', 'Patient'),
        ('attendant', 'Attendant'),
    )

    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, blank=True, null=True)
    mobile_number = models.CharField(max_length=15, unique=True, blank=True, null=True)
    password = models.CharField(max_length=100)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES)

    def __str__(self):
        return self.name


# Patient Model
class Patient(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    age = models.IntegerField()
    history = models.TextField(blank=True, default="")

    def __str__(self):
        return self.user.name


# Doctor Model
class Doctor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    specialization = models.CharField(max_length=100)

    def __str__(self):
        return self.user.name


# Appointment Model
class Appointment(models.Model):
    QUEUE_STATUS_CHOICES = (
        ("waiting", "Waiting"),
        ("checked_in", "Checked In"),
        ("in_consultation", "In Consultation"),
        ("completed", "Completed"),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    date = models.DateField()
    time_slot = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=50)
    queue_status = models.CharField(max_length=30, choices=QUEUE_STATUS_CHOICES, default="waiting")
    reason = models.CharField(max_length=200, blank=True, default="")
    pre_checkin_notes = models.TextField(blank=True, default="")
    is_no_show = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.patient} - {self.doctor}"


# Billing Model
class Billing(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    appointment = models.ForeignKey('Appointment', on_delete=models.SET_NULL, blank=True, null=True)
    amount = models.FloatField()
    status = models.CharField(max_length=50)
    invoice_number = models.CharField(max_length=40, unique=True, blank=True, null=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return str(self.amount)


class Prescription(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, blank=True, null=True)
    diagnosis = models.TextField()
    medicines = models.TextField()
    notes = models.TextField(blank=True, default="")
    follow_up_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Prescription {self.id} - {self.patient}"


class MedicalRecord(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    title = models.CharField(max_length=150)
    record_file = models.FileField(upload_to="medical_records/", blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class ActivityLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=80)
    entity_id = models.PositiveIntegerField(blank=True, null=True)
    details = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.action} - {self.entity_type}"


class AccessToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    key = models.CharField(max_length=80, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"Token {self.user_id}"


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"OTP {self.user_id}"


class PatientSignupOTP(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    mobile_number = models.CharField(max_length=15)
    password = models.CharField(max_length=255)
    age = models.IntegerField()
    history = models.TextField(blank=True, default="")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def __str__(self):
        return f"Patient Signup OTP {self.mobile_number}"


class FamilyAccess(models.Model):
    RELATION_CHOICES = (
        ("father", "Father"),
        ("mother", "Mother"),
        ("son", "Son"),
        ("daughter", "Daughter"),
        ("brother", "Brother"),
        ("sister", "Sister"),
        ("other", "Other"),
    )

    attendant_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_links")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="attendant_links")
    relation = models.CharField(max_length=50, choices=RELATION_CHOICES, blank=True, default="other")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("attendant_user", "patient")

    def __str__(self):
        return f"{self.attendant_user.name} -> {self.patient.user.name}"


class Admission(models.Model):
    ROOM_TYPE_CHOICES = (
        ("ac", "AC"),
        ("non_ac", "Non AC"),
    )

    STATUS_CHOICES = (
        ("admitted", "Admitted"),
        ("discharged", "Discharged"),
    )

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name="created_admissions")
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name="updated_admissions")
    room_number = models.CharField(max_length=30, blank=True, default="")
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default="non_ac")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="admitted")
    admission_reason = models.TextField(blank=True, default="")
    care_notes = models.TextField(blank=True, default="")
    medicine_notes = models.TextField(blank=True, default="")
    admitted_at = models.DateTimeField(default=timezone.now)
    discharged_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Admission {self.patient.user.name} - {self.status}"
