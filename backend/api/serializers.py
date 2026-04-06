import os

from django.utils import timezone
from rest_framework import serializers

from .models import *

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'


class PatientSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_mobile = serializers.CharField(source="user.mobile_number", read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'


class DoctorSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_mobile = serializers.CharField(source="user.mobile_number", read_only=True)

    class Meta:
        model = Doctor
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)
    patient_mobile = serializers.CharField(source="patient.user.mobile_number", read_only=True)
    doctor_name = serializers.CharField(source="doctor.user.name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    visit_stage = serializers.SerializerMethodField()
    queue_position = serializers.SerializerMethodField()
    estimated_wait_minutes = serializers.SerializerMethodField()
    can_repeat_booking = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = '__all__'

    def get_visit_stage(self, obj):
        if obj.is_no_show:
            return "Marked no-show"
        mapping = {
            "waiting": "Waiting for check-in",
            "checked_in": "Checked in",
            "in_consultation": "With doctor",
            "completed": "Visit completed",
        }
        return mapping.get(obj.queue_status, obj.queue_status or "Waiting")

    def get_queue_position(self, obj):
        if obj.is_no_show:
            return None
        if obj.queue_status not in {"waiting", "checked_in", "in_consultation"}:
            return None
        if obj.date != timezone.localdate():
            return None

        queue_queryset = Appointment.objects.filter(
            doctor=obj.doctor,
            date=obj.date,
            queue_status__in=["waiting", "checked_in", "in_consultation"],
        ).order_by("time_slot", "id")
        ordered_ids = list(queue_queryset.values_list("id", flat=True))
        if obj.id not in ordered_ids:
            return None
        return ordered_ids.index(obj.id) + 1

    def get_estimated_wait_minutes(self, obj):
        if obj.is_no_show:
            return None
        position = self.get_queue_position(obj)
        if not position:
            return 0 if obj.queue_status == "in_consultation" else None

        try:
            minutes_per_visit = max(5, int(os.getenv("QUEUE_AVG_MINUTES_PER_VISIT", "15")))
        except ValueError:
            minutes_per_visit = 15

        if obj.queue_status == "in_consultation":
            return minutes_per_visit
        return max(0, (position - 1) * minutes_per_visit)

    def get_can_repeat_booking(self, obj):
        return obj.status == "Completed" or obj.queue_status == "completed"


class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)
    patient_mobile = serializers.CharField(source="patient.user.mobile_number", read_only=True)
    appointment_date = serializers.CharField(source="appointment.date", read_only=True)
    appointment_time_slot = serializers.CharField(source="appointment.time_slot", read_only=True)

    class Meta:
        model = Billing
        fields = '__all__'


class PrescriptionSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.user.name", read_only=True)
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)

    class Meta:
        model = Prescription
        fields = '__all__'


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.name", read_only=True)
    record_file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = MedicalRecord
        fields = '__all__'


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.name", read_only=True)
    actor_role = serializers.CharField(source="actor.role", read_only=True)

    class Meta:
        model = ActivityLog
        fields = '__all__'


class FamilyAccessSerializer(serializers.ModelSerializer):
    attendant_name = serializers.CharField(source="attendant_user.name", read_only=True)
    attendant_mobile = serializers.CharField(source="attendant_user.mobile_number", read_only=True)
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)
    patient_mobile = serializers.CharField(source="patient.user.mobile_number", read_only=True)

    class Meta:
        model = FamilyAccess
        fields = '__all__'


class AdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.user.name", read_only=True)
    patient_mobile = serializers.CharField(source="patient.user.mobile_number", read_only=True)
    doctor_name = serializers.CharField(source="doctor.user.name", read_only=True)
    doctor_specialization = serializers.CharField(source="doctor.specialization", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.name", read_only=True)
    appointment_date = serializers.CharField(source="appointment.date", read_only=True)
    appointment_time_slot = serializers.CharField(source="appointment.time_slot", read_only=True)

    class Meta:
        model = Admission
        fields = "__all__"
