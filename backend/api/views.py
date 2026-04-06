import html
import os
import secrets
from datetime import datetime, time, timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    Admission,
    AccessToken,
    ActivityLog,
    Appointment,
    Billing,
    Doctor,
    FamilyAccess,
    MedicalRecord,
    PasswordResetOTP,
    Patient,
    PatientSignupOTP,
    Prescription,
    User,
)
from .notifications import send_sms_message, send_whatsapp_message
from .serializers import (
    AdmissionSerializer,
    ActivityLogSerializer,
    AppointmentSerializer,
    BillingSerializer,
    DoctorSerializer,
    FamilyAccessSerializer,
    MedicalRecordSerializer,
    PatientSerializer,
    PrescriptionSerializer,
)


SUMMARY_SCOPE_LABELS = {
    "overview": "Overall overview",
    "monthly": "This month",
    "daily": "Today",
}


def _parse_date_param(raw_value):
    try:
        return datetime.strptime(str(raw_value).strip(), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _parse_month_param(raw_value):
    try:
        month_value = datetime.strptime(str(raw_value).strip(), "%Y-%m").date()
        return month_value.replace(day=1)
    except (TypeError, ValueError):
        return None


def _error(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=status_code)


def _normalize_mobile(raw_value):
    digits = "".join(char for char in str(raw_value or "") if char.isdigit())
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[-10:]
    return None


def _generate_password(length=10):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_otp():
    return "".join(secrets.choice("0123456789") for _ in range(6))


def _build_placeholder_email(mobile_number):
    return f"patient.{mobile_number}@hospital.local"


def _build_family_member_email():
    return f"family.{secrets.token_hex(8)}@hospital.local"


def _normalize_family_relation(raw_value):
    value = str(raw_value or "").strip().lower()
    if value in dict(FamilyAccess.RELATION_CHOICES):
        return value
    return "other"


def _hospital_name():
    return os.getenv("HOSPITAL_NAME", "Hospital Management System")


def _hospital_link():
    return os.getenv("HOSPITAL_PORTAL_LINK", "http://127.0.0.1:3000")


def _invoice_number():
    return f"INV-{timezone.now().strftime('%Y%m%d%H%M%S')}-{secrets.randbelow(900) + 100}"


def _log_activity(actor, action, entity_type, entity_id=None, details=""):
    ActivityLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )


def _notify_patient(mobile_number, message):
    sms_status = send_sms_message(mobile_number, message)
    whatsapp_status = send_whatsapp_message(mobile_number, message)
    return {
        "sms": sms_status,
        "whatsapp": whatsapp_status,
    }


def _send_account_notification(user, generated_password):
    role_label = user.role.title()
    message = (
        f"{_hospital_name()}\n"
        f"{role_label} login created.\n"
        f"Name: {user.name}\n"
        f"Mobile: {user.mobile_number}\n"
        f"Password: {generated_password}\n"
        f"Login: {_hospital_link()}"
    )
    return _notify_patient(user.mobile_number, message)


def _send_billing_notification(patient, bill):
    message = (
        f"{_hospital_name()}\n"
        f"Billing update\n"
        f"Patient: {patient.user.name}\n"
        f"Mobile: {patient.user.mobile_number}\n"
        f"Age: {patient.age}\n"
        f"History: {patient.history}\n"
        f"Invoice: {bill.invoice_number}\n"
        f"Amount: Rs. {bill.amount}\n"
        f"Status: {bill.status}\n"
        f"Hospital link: {_hospital_link()}"
    )
    return _notify_patient(patient.user.mobile_number, message)


def _send_appointment_notification(appointment):
    message = (
        f"{_hospital_name()}\n"
        f"Appointment update\n"
        f"Patient: {appointment.patient.user.name}\n"
        f"Doctor: {appointment.doctor.user.name}\n"
        f"Date: {appointment.date}\n"
        f"Time: {appointment.time_slot or 'Not set'}\n"
        f"Status: {appointment.status}\n"
        f"Queue: {appointment.queue_status}\n"
        f"Hospital link: {_hospital_link()}"
    )
    return _notify_patient(appointment.patient.user.mobile_number, message)


def _send_otp_notification(user, otp_code):
    message = (
        f"{_hospital_name()}\n"
        f"Password reset OTP\n"
        f"Name: {user.name}\n"
        f"OTP: {otp_code}\n"
        f"Valid for 10 minutes."
    )
    return _notify_patient(user.mobile_number, message)


def _send_signup_otp_notification(name, mobile_number, otp_code):
    message = (
        f"{_hospital_name()}\n"
        f"Patient signup OTP\n"
        f"Name: {name}\n"
        f"OTP: {otp_code}\n"
        f"Valid for 10 minutes."
    )
    return _notify_patient(mobile_number, message)


def _slot_interval_minutes():
    try:
        return max(10, int(os.getenv("APPOINTMENT_SLOT_MINUTES", "30")))
    except ValueError:
        return 30


def _daily_slot_window():
    try:
        start_hour = int(os.getenv("APPOINTMENT_DAY_START_HOUR", "9"))
        end_hour = int(os.getenv("APPOINTMENT_DAY_END_HOUR", "17"))
    except ValueError:
        start_hour, end_hour = 9, 17
    if end_hour <= start_hour:
        start_hour, end_hour = 9, 17
    return start_hour, end_hour


def _generate_daily_slots():
    start_hour, end_hour = _daily_slot_window()
    interval_minutes = _slot_interval_minutes()
    slots = []
    current_minutes = start_hour * 60
    end_minutes = end_hour * 60
    while current_minutes < end_minutes:
        slot_hour = current_minutes // 60
        slot_minute = current_minutes % 60
        slots.append(f"{slot_hour:02d}:{slot_minute:02d}")
        current_minutes += interval_minutes
    return slots


def _parse_date(value):
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _parse_time(value):
    try:
        return datetime.strptime(str(value), "%H:%M").time()
    except (TypeError, ValueError):
        return None


def _normalize_appointment_time_slot(raw_value):
    if isinstance(raw_value, time):
        return raw_value.strftime("%H:%M")
    parsed_time = _parse_time(raw_value)
    return parsed_time.strftime("%H:%M") if parsed_time else None


def _verify_password(user, raw_password):
    stored_password = user.password or ""

    if stored_password.startswith("pbkdf2_"):
        return check_password(raw_password, stored_password)

    if stored_password == raw_password:
        user.password = make_password(raw_password)
        user.save(update_fields=["password"])
        return True

    return False


def _get_user(user_id):
    if not user_id:
        return None

    try:
        return User.objects.get(id=user_id)
    except (TypeError, ValueError, User.DoesNotExist):
        return None


def _get_or_create_patient_profile(user):
    if not user or user.role not in {"patient", "attendant"}:
        return None

    patient, _ = Patient.objects.get_or_create(
        user=user,
        defaults={
            "age": 0,
            "history": "",
        },
    )
    return patient


def _create_token(user):
    AccessToken.objects.filter(user=user).delete()
    token = AccessToken.objects.create(
        user=user,
        key=secrets.token_hex(24),
        expires_at=timezone.now() + timedelta(hours=12),
    )
    return token


def _get_current_user(request):
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Token "):
        token_key = auth_header.split(" ", 1)[1].strip()
        token = AccessToken.objects.select_related("user").filter(
            key=token_key,
            expires_at__gt=timezone.now(),
        ).first()
        if token:
            return token.user

    header_user_id = request.headers.get("X-User-Id")
    query_user_id = request.query_params.get("user_id") if hasattr(request, "query_params") else None
    return _get_user(header_user_id or query_user_id)


def _require_role(request, *roles):
    user = _get_current_user(request)

    if not user:
        return None, _error("Please log in first.", status.HTTP_401_UNAUTHORIZED)

    if roles and user.role not in roles:
        allowed = ", ".join(roles)
        return None, _error(f"Only {allowed} can access this section.", status.HTTP_403_FORBIDDEN)

    return user, None


def _queue_counts(queryset):
    return {
        "waiting": queryset.filter(queue_status="waiting").count(),
        "checked_in": queryset.filter(queue_status="checked_in").count(),
        "in_consultation": queryset.filter(queue_status="in_consultation").count(),
        "completed": queryset.filter(queue_status="completed").count(),
    }


@api_view(["GET"])
def api_index(request):
    return Response(
        {
            "message": "Hospital Management System API is running.",
            "endpoints": {
                "login": "/api/login/",
                "register": "/api/register/",
                "forgot_password": "/api/forgot-password/",
                "dashboard_summary": "/api/summary/",
            },
        }
    )


@api_view(["POST"])
def custom_login(request):
    identifier = request.data.get("identifier", request.data.get("email", "")).strip()
    password = request.data.get("password", "")
    normalized_mobile = _normalize_mobile(identifier)
    lookup = Q(email=identifier)

    if normalized_mobile:
        lookup |= Q(mobile_number=normalized_mobile)

    user = User.objects.filter(lookup).first()
    if not user or not _verify_password(user, password):
        return _error("Invalid credentials", status.HTTP_401_UNAUTHORIZED)

    token = _create_token(user)
    _log_activity(user, "login", "user", user.id, "User logged in.")

    payload = {
        "message": "Login Success",
        "role": user.role,
        "user_id": user.id,
        "name": user.name,
        "token": token.key,
        "token_expires_at": token.expires_at.isoformat(),
    }

    if user.role == "doctor":
        payload["doctor_id"] = Doctor.objects.filter(user=user).values_list("id", flat=True).first()
    if user.role == "patient":
        payload["patient_id"] = _get_or_create_patient_profile(user).id
    if user.role == "attendant":
        payload["linked_patients"] = FamilyAccess.objects.filter(attendant_user=user).count()

    return Response(payload)


@api_view(["POST"])
def request_password_reset(request):
    identifier = request.data.get("identifier", "").strip()
    normalized_mobile = _normalize_mobile(identifier)
    lookup = Q(email=identifier)
    if normalized_mobile:
        lookup |= Q(mobile_number=normalized_mobile)

    user = User.objects.filter(lookup).first()
    if not user or not user.mobile_number:
        return _error("Account with mobile number not found.", status.HTTP_404_NOT_FOUND)

    otp_code = _generate_otp()
    PasswordResetOTP.objects.create(
        user=user,
        code=otp_code,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    notification = _send_otp_notification(user, otp_code)
    _log_activity(user, "password_reset_requested", "user", user.id, "OTP generated.")
    response_payload = {
        "message": "OTP sent to mobile." if notification["sms"]["status"] == "sent" else "OTP saved in outbox.",
        "notification": notification,
    }
    if settings.DEBUG and notification["sms"]["status"] != "sent":
        response_payload["otp_code"] = otp_code
    return Response(response_payload)


@api_view(["POST"])
def reset_password(request):
    identifier = request.data.get("identifier", "").strip()
    code = request.data.get("code", "").strip()
    new_password = request.data.get("new_password", "")

    if not new_password:
        return _error("New password is required.")

    normalized_mobile = _normalize_mobile(identifier)
    lookup = Q(email=identifier)
    if normalized_mobile:
        lookup |= Q(mobile_number=normalized_mobile)

    user = User.objects.filter(lookup).first()
    if not user:
        return _error("User not found.", status.HTTP_404_NOT_FOUND)

    otp = PasswordResetOTP.objects.filter(
        user=user,
        code=code,
        is_used=False,
        expires_at__gt=timezone.now(),
    ).order_by("-created_at").first()

    if not otp:
        return _error("Invalid or expired OTP.")

    user.password = make_password(new_password)
    user.save(update_fields=["password"])
    otp.is_used = True
    otp.save(update_fields=["is_used"])
    _log_activity(user, "password_reset_completed", "user", user.id, "Password reset completed.")
    return Response({"message": "Password reset successful."})


@api_view(["POST"])
def request_patient_signup_otp(request):
    name = request.data.get("name", "").strip()
    raw_mobile_number = request.data.get("mobile_number", "")
    email = request.data.get("email", "").strip() or None
    password = request.data.get("password", "")
    age = request.data.get("age")
    history = request.data.get("history", "").strip()

    if not name:
        return _error("Please enter your full name.")
    if not password:
        return _error("Please set a password.")

    mobile_number = _normalize_mobile(raw_mobile_number)
    if not mobile_number:
        return _error("Please enter a valid 10-digit mobile number.")

    try:
        age_value = int(age)
    except (TypeError, ValueError):
        return _error("Please enter a valid age.")

    if age_value <= 0:
        return _error("Age must be greater than zero.")

    if User.objects.filter(mobile_number=mobile_number).exists():
        return _error("This mobile number is already registered.")

    if email and User.objects.filter(email=email).exists():
        return _error("This email is already registered.")

    otp_code = _generate_otp()
    PatientSignupOTP.objects.filter(mobile_number=mobile_number, is_used=False).delete()
    PatientSignupOTP.objects.create(
        name=name,
        email=email,
        mobile_number=mobile_number,
        password=make_password(password),
        age=age_value,
        history=history,
        code=otp_code,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    notification = _send_signup_otp_notification(name, mobile_number, otp_code)
    _log_activity(None, "patient_signup_requested", "patient_signup", None, mobile_number)
    return Response(
        {
            "message": "Signup OTP sent to mobile." if notification["sms"]["status"] == "sent" else "Signup OTP saved in outbox.",
            "notification": notification,
        }
    )


@api_view(["POST"])
def verify_patient_signup_otp(request):
    raw_mobile_number = request.data.get("mobile_number", "")
    code = request.data.get("code", "").strip()

    mobile_number = _normalize_mobile(raw_mobile_number)
    if not mobile_number:
        return _error("Please enter a valid 10-digit mobile number.")
    if not code:
        return _error("OTP is required.")

    signup_request = PatientSignupOTP.objects.filter(
        mobile_number=mobile_number,
        code=code,
        is_used=False,
        expires_at__gt=timezone.now(),
    ).order_by("-created_at").first()

    if not signup_request:
        return _error("Invalid or expired OTP.")

    if User.objects.filter(mobile_number=mobile_number).exists():
        return _error("This mobile number is already registered.")
    if signup_request.email and User.objects.filter(email=signup_request.email).exists():
        return _error("This email is already registered.")

    user = User.objects.create(
        name=signup_request.name,
        email=signup_request.email or _build_placeholder_email(mobile_number),
        mobile_number=mobile_number,
        password=signup_request.password,
        role="patient",
    )
    patient = Patient.objects.create(
        user=user,
        age=signup_request.age,
        history=signup_request.history,
    )
    signup_request.is_used = True
    signup_request.save(update_fields=["is_used"])
    _log_activity(user, "patient_signup_completed", "patient", patient.id, mobile_number)
    return Response({"message": "Signup successful. Please log in.", "user_id": user.id, "patient_id": patient.id}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def register(request):
    current_user, error = _require_role(request, "admin", "frontdesk")
    if error:
        return error

    name = request.data.get("name", "").strip()
    role = request.data.get("role", "").strip()
    email = request.data.get("email", "").strip() or None
    password = request.data.get("password", "")
    raw_mobile_number = request.data.get("mobile_number", "")

    if not name:
        return _error("Please enter the user name.")
    if role not in dict(User.ROLE_CHOICES):
        return _error("Please choose a valid role.")

    mobile_number = _normalize_mobile(raw_mobile_number) if raw_mobile_number else None
    if raw_mobile_number and not mobile_number:
        return _error("Please enter a valid 10-digit mobile number.")

    if role in {"patient", "attendant"}:
        if not mobile_number:
            return _error(f"{role.title()} mobile number is required.")
        if User.objects.filter(mobile_number=mobile_number).exists():
            return _error("This mobile number is already registered.")

        generated_password = _generate_password()
        user_record = User.objects.create(
            name=name,
            email=_build_placeholder_email(mobile_number),
            mobile_number=mobile_number,
            password=make_password(generated_password),
            role=role,
        )
        notification = _send_account_notification(user_record, generated_password)
        action = "create_patient_user" if role == "patient" else "create_attendant_user"
        _log_activity(current_user, action, "user", user_record.id, f"{role.title()} mobile {mobile_number}")
        return Response(
            {
                "message": f"{role.title()} user created.",
                "notification": notification,
                "generated_password": generated_password,
                "mobile_number": mobile_number,
            },
            status=status.HTTP_201_CREATED,
        )

    if not email:
        return _error("Email is required for this role.")
    if not password:
        return _error("Password is required for this role.")
    if User.objects.filter(email=email).exists():
        return _error("This email is already registered.")
    if mobile_number and User.objects.filter(mobile_number=mobile_number).exists():
        return _error("This mobile number is already registered.")

    user_record = User.objects.create(
        name=name,
        email=email,
        mobile_number=mobile_number,
        password=make_password(password),
        role=role,
    )
    _log_activity(current_user, "register_user", "user", user_record.id, f"Role {role}")
    return Response({"message": "User Registered", "user_id": user_record.id}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def dashboard_summary(request):
    user, error = _require_role(request, "admin", "frontdesk")
    if error:
        return error

    scope = request.query_params.get("scope", "overview").strip().lower()
    if scope not in SUMMARY_SCOPE_LABELS:
        scope = "overview"

    today = timezone.localdate()
    selected_day = _parse_date_param(request.query_params.get("date")) or today
    selected_month = _parse_month_param(request.query_params.get("month")) or today.replace(day=1)
    patient_queryset = Patient.objects.all()
    doctor_queryset = Doctor.objects.all()
    appointment_queryset = Appointment.objects.all()
    billing_queryset = Billing.objects.all()
    scope_label = SUMMARY_SCOPE_LABELS[scope]

    if scope == "daily":
        appointment_queryset = appointment_queryset.filter(date=selected_day)
        billing_queryset = billing_queryset.filter(created_at__date=selected_day)
        scope_label = selected_day.strftime("Daily view - %d %b %Y")
    elif scope == "monthly":
        month_start = selected_month
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1, day=1)
        month_end = next_month - timedelta(days=1)
        appointment_queryset = appointment_queryset.filter(date__gte=month_start, date__lte=month_end)
        billing_queryset = billing_queryset.filter(created_at__date__gte=month_start, created_at__date__lte=month_end)
        scope_label = month_start.strftime("Monthly view - %b %Y")

    total_billing = billing_queryset.aggregate(total=Sum("amount"))["total"] or 0
    today_appointments = Appointment.objects.filter(date=today)
    return Response(
        {
            "patients": patient_queryset.count(),
            "doctors": doctor_queryset.count(),
            "appointments": appointment_queryset.count(),
            "billing_total": total_billing,
            "scope": scope,
            "scope_label": scope_label,
            "queue": _queue_counts(today_appointments),
            "prescriptions": Prescription.objects.count(),
            "medical_records": MedicalRecord.objects.count(),
        }
    )


@api_view(["GET"])
def patient_users(request):
    user, error = _require_role(request, "frontdesk")
    if error:
        return error

    query = request.query_params.get("q", "").strip()
    users = User.objects.filter(role="patient")
    if query:
        users = users.filter(Q(name__icontains=query) | Q(mobile_number__icontains=query))

    users = users.order_by("name")
    profiled_user_ids = set(Patient.objects.values_list("user_id", flat=True))
    return Response(
        [
            {
                "id": item.id,
                "name": item.name,
                "email": item.email,
                "mobile_number": item.mobile_number,
                "has_profile": item.id in profiled_user_ids,
            }
            for item in users
        ]
    )


@api_view(["POST"])
def reset_patient_login_password(request, user_id):
    current_user, error = _require_role(request, "frontdesk", "admin")
    if error:
        return error

    patient_user = User.objects.filter(id=user_id, role="patient").first()
    if not patient_user:
        return _error("Patient user not found.", status.HTTP_404_NOT_FOUND)
    if not patient_user.mobile_number:
        return _error("Patient mobile number is missing.")

    generated_password = _generate_password()
    patient_user.password = make_password(generated_password)
    patient_user.save(update_fields=["password"])
    notification = _send_account_notification(patient_user, generated_password)
    _log_activity(current_user, "reset_patient_password", "user", patient_user.id, patient_user.mobile_number)
    return Response(
        {
            "message": "Temporary password generated.",
            "generated_password": generated_password,
            "mobile_number": patient_user.mobile_number,
            "notification": notification,
        }
    )


@api_view(["GET"])
def attendant_users(request):
    user, error = _require_role(request, "frontdesk", "admin")
    if error:
        return error

    query = request.query_params.get("q", "").strip()
    users = User.objects.filter(role="attendant")
    if query:
        users = users.filter(Q(name__icontains=query) | Q(mobile_number__icontains=query))

    users = users.order_by("name")
    return Response(
        [
            {
                "id": item.id,
                "name": item.name,
                "email": item.email,
                "mobile_number": item.mobile_number,
            }
            for item in users
        ]
    )


@api_view(["GET", "POST"])
def family_access(request):
    current_user, error = _require_role(request, "frontdesk", "admin", "attendant", "patient")
    if error:
        return error

    if request.method == "GET":
        queryset = FamilyAccess.objects.select_related("attendant_user", "patient__user").order_by("-created_at")
        if current_user.role == "attendant":
            queryset = queryset.filter(attendant_user=current_user)
        elif current_user.role == "patient":
            queryset = queryset.filter(patient__user=current_user)
        else:
            attendant_user_id = request.query_params.get("attendant_user_id")
            patient_id = request.query_params.get("patient_id")
            if attendant_user_id:
                queryset = queryset.filter(attendant_user_id=attendant_user_id)
            if patient_id:
                queryset = queryset.filter(patient_id=patient_id)
        return Response(FamilyAccessSerializer(queryset, many=True).data)

    if current_user.role == "patient":
        patient = _get_or_create_patient_profile(current_user)
        relation = _normalize_family_relation(request.data.get("relation"))
        raw_mobile_number = request.data.get("mobile_number", "")
        attendant_name = request.data.get("attendant_name", "").strip()
        mobile_number = _normalize_mobile(raw_mobile_number)

        if not mobile_number:
            return _error("Please enter a valid 10-digit family mobile number.")

        attendant_user = User.objects.filter(mobile_number=mobile_number).first()
        generated_password = None
        notification = None

        if attendant_user:
            if attendant_user.role != "attendant":
                return _error("This mobile number is already used by another account.")
        else:
            if not attendant_name:
                return _error("Please enter family member name.")

            generated_password = _generate_password()
            attendant_user = User.objects.create(
                name=attendant_name,
                email=_build_placeholder_email(mobile_number),
                mobile_number=mobile_number,
                password=make_password(generated_password),
                role="attendant",
            )
            notification = _send_account_notification(attendant_user, generated_password)

        if FamilyAccess.objects.filter(attendant_user=attendant_user, patient=patient).exists():
            return _error("This family access already exists.")

        link = FamilyAccess.objects.create(attendant_user=attendant_user, patient=patient, relation=relation)
        _log_activity(current_user, "patient_create_family_access", "family_access", link.id, f"{current_user.name} -> {attendant_user.name}")
        response_payload = {"message": "Family access granted.", "attendant_user_id": attendant_user.id}
        if generated_password:
            response_payload.update(
                {
                    "generated_password": generated_password,
                    "mobile_number": mobile_number,
                    "attendant_name": attendant_user.name,
                    "notification": notification,
                }
            )
        return Response(response_payload, status=status.HTTP_201_CREATED)

    if current_user.role not in {"frontdesk", "admin"}:
        return _error("Only staff can create family access.", status.HTTP_403_FORBIDDEN)

    attendant_user = User.objects.filter(id=request.data.get("attendant_user"), role="attendant").first()
    patient = Patient.objects.select_related("user").filter(id=request.data.get("patient")).first()
    relation = _normalize_family_relation(request.data.get("relation"))
    if not attendant_user:
        return _error("Please choose a valid attendant user.")
    if not patient:
        return _error("Please choose a valid patient.")
    if FamilyAccess.objects.filter(attendant_user=attendant_user, patient=patient).exists():
        return _error("This family access already exists.")

    link = FamilyAccess.objects.create(attendant_user=attendant_user, patient=patient, relation=relation)
    _log_activity(current_user, "create_family_access", "family_access", link.id, f"{attendant_user.name} -> {patient.user.name}")
    return Response({"message": "Family access linked."}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def family_access_detail(request, link_id):
    current_user, error = _require_role(request, "frontdesk", "admin")
    if error:
        return error

    link = FamilyAccess.objects.select_related("attendant_user", "patient__user").filter(id=link_id).first()
    if not link:
        return _error("Family access not found.", status.HTTP_404_NOT_FOUND)

    link.delete()
    _log_activity(current_user, "delete_family_access", "family_access", link_id, "")
    return Response({"message": "Family access removed."})


@api_view(["POST"])
def attendant_family_members(request):
    current_user, error = _require_role(request, "attendant", "frontdesk", "admin")
    if error:
        return error

    attendant_user_id = request.data.get("attendant_user")
    if current_user.role == "attendant":
        attendant_user = current_user
    else:
        attendant_user = User.objects.filter(id=attendant_user_id, role="attendant").first()
        if not attendant_user:
            return _error("Please choose a valid attendant.")

    name = request.data.get("name", "").strip()
    age = request.data.get("age")
    history = request.data.get("history", "").strip()
    relation = _normalize_family_relation(request.data.get("relation", "other"))

    if not name:
        return _error("Please enter patient name.")
    try:
        age_value = int(age)
    except (TypeError, ValueError):
        return _error("Please enter a valid age.")
    if age_value < 0:
        return _error("Age must be zero or more.")
    patient_user = User.objects.create(
        name=name,
        email=_build_family_member_email(),
        mobile_number=None,
        password=make_password(_generate_password()),
        role="patient",
    )
    patient = Patient.objects.create(user=patient_user, age=age_value, history=history)
    link = FamilyAccess.objects.create(attendant_user=attendant_user, patient=patient, relation=relation)
    _log_activity(current_user, "create_family_member_patient", "patient", patient.id, f"{attendant_user.name} -> {name}")
    return Response(
        {
            "message": "Family patient added under attendant account.",
            "patient_id": patient.id,
            "family_access_id": link.id,
            "shared_mobile_number": attendant_user.mobile_number,
            "uses_family_account": True,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def doctors(request):
    user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    query = request.query_params.get("q", "").strip()
    queryset = Doctor.objects.select_related("user").order_by("user__name")
    if query:
        queryset = queryset.filter(
            Q(user__name__icontains=query)
            | Q(specialization__icontains=query)
            | Q(user__email__icontains=query)
        )
    return Response(DoctorSerializer(queryset, many=True).data)


@api_view(["GET"])
def get_patients(request):
    user, error = _require_role(request, "admin", "frontdesk")
    if error:
        return error

    attendant_users = User.objects.filter(role="attendant")
    for attendant_user in attendant_users:
        _get_or_create_patient_profile(attendant_user)

    query = request.query_params.get("q", "").strip()
    queryset = Patient.objects.select_related("user").order_by("user__name")
    if query:
        queryset = queryset.filter(
            Q(user__name__icontains=query)
            | Q(user__mobile_number__icontains=query)
            | Q(history__icontains=query)
        )
    return Response(PatientSerializer(queryset, many=True).data)


@api_view(["POST"])
def add_patient(request):
    current_user, error = _require_role(request, "frontdesk")
    if error:
        return error

    user_id = request.data.get("user")
    selected_user = _get_user(user_id)

    if not selected_user:
        return _error("Please choose a valid patient user.")
    if selected_user.role not in {"patient", "attendant"}:
        return _error("Selected user must be a patient or attendant.")
    if Patient.objects.filter(user=selected_user).exists():
        return _error("This patient profile already exists.")

    serializer = PatientSerializer(data=request.data)
    if serializer.is_valid():
        patient = serializer.save()
        _log_activity(current_user, "create_patient_profile", "patient", patient.id, selected_user.name)
        return Response({"message": "Patient Added"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def patient_detail(request, patient_id):
    current_user, error = _require_role(request, "admin", "frontdesk", "patient")
    if error:
        return error

    patient = Patient.objects.select_related("user").filter(id=patient_id).first()
    if not patient:
        return _error("Patient not found.", status.HTTP_404_NOT_FOUND)

    if current_user.role == "patient" and patient.user_id != current_user.id:
        return _error("You can update only your own profile.", status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response(PatientSerializer(patient).data)

    if request.method == "PUT":
        linked_user = patient.user
        new_name = str(request.data.get("name", linked_user.name)).strip()
        raw_mobile_number = request.data.get("mobile_number", linked_user.mobile_number)
        normalized_mobile_number = _normalize_mobile(raw_mobile_number) if raw_mobile_number else None

        if not new_name:
            return _error("Name is required.")

        if raw_mobile_number and not normalized_mobile_number:
            return _error("Please enter a valid 10-digit mobile number.")

        if normalized_mobile_number and User.objects.exclude(id=linked_user.id).filter(mobile_number=normalized_mobile_number).exists():
            return _error("This mobile number is already registered.")

        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            linked_user.name = new_name
            linked_user.mobile_number = normalized_mobile_number
            linked_user.save(update_fields=["name", "mobile_number"])
            serializer.save()
            _log_activity(current_user, "update_patient_profile", "patient", patient.id, linked_user.name)
            return Response({"message": "Patient updated."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if current_user.role not in {"admin", "frontdesk"}:
        return _error("Only admin or front-desk can delete profiles.", status.HTTP_403_FORBIDDEN)

    linked_user = patient.user
    linked_user_id = linked_user.id
    linked_user_name = linked_user.name
    linked_user.delete()
    _log_activity(current_user, "delete_patient_profile", "patient", patient_id, linked_user_name)
    _log_activity(current_user, "delete_patient_user", "user", linked_user_id, linked_user_name)
    return Response({"message": "Patient permanently deleted."})


@api_view(["GET"])
def queue_summary(request):
    user, error = _require_role(request, "admin", "frontdesk")
    if error:
        return error

    date_value = request.query_params.get("date")
    queryset = Appointment.objects.all()
    if date_value:
        queryset = queryset.filter(date=date_value)
    else:
        queryset = queryset.filter(date=timezone.localdate())

    return Response(_queue_counts(queryset))


@api_view(["GET"])
def doctor_available_slots(request, doctor_id):
    user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    doctor = Doctor.objects.select_related("user").filter(id=doctor_id).first()
    if not doctor:
        return _error("Doctor not found.", status.HTTP_404_NOT_FOUND)

    date_value = request.query_params.get("date")
    selected_date = _parse_date(date_value)
    if not selected_date:
        return _error("Please select a valid date.")
    if selected_date < timezone.localdate():
        return _error("Please select today or a future date.")

    all_slots = _generate_daily_slots()
    booked_slots = {
        appointment.time_slot.strftime("%H:%M")
        for appointment in Appointment.objects.filter(doctor=doctor, date=selected_date).exclude(time_slot__isnull=True)
    }
    available_slots = [slot for slot in all_slots if slot not in booked_slots]

    return Response(
        {
            "doctor": DoctorSerializer(doctor).data,
            "date": selected_date.isoformat(),
            "slot_interval_minutes": _slot_interval_minutes(),
            "slots": all_slots,
            "booked_slots": sorted(booked_slots),
            "available_slots": available_slots,
        }
    )


@api_view(["GET", "POST"])
def appointments(request):
    user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    if request.method == "GET":
        queryset = Appointment.objects.select_related("patient__user", "doctor__user").order_by("-date", "-time_slot")

        if user.role == "doctor":
            queryset = queryset.filter(doctor__user=user)
        elif user.role == "patient":
            queryset = queryset.filter(patient__user=user)
        else:
            doctor_user_id = request.query_params.get("doctor_user_id")
            patient_user_id = request.query_params.get("patient_user_id")
            status_filter = request.query_params.get("status")
            queue_filter = request.query_params.get("queue_status")
            date_filter = request.query_params.get("date")
            today_only = request.query_params.get("today")

            if doctor_user_id:
                queryset = queryset.filter(doctor__user_id=doctor_user_id)
            if patient_user_id:
                queryset = queryset.filter(patient__user_id=patient_user_id)
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if queue_filter:
                queryset = queryset.filter(queue_status=queue_filter)
            if date_filter:
                queryset = queryset.filter(date=date_filter)
            if today_only:
                queryset = queryset.filter(date=timezone.localdate())

        return Response(AppointmentSerializer(queryset, many=True).data)

    if user.role not in {"frontdesk", "patient"}:
        return _error("Only front-desk or patient can create appointments.", status.HTTP_403_FORBIDDEN)

    payload = request.data.copy()
    doctor_id = payload.get("doctor")
    date_value = payload.get("date")
    time_slot = payload.get("time_slot")

    if not doctor_id:
        return _error("Please choose a doctor.")
    if not date_value:
        return _error("Please choose an appointment date.")
    if not time_slot:
        return _error("Please choose an appointment time.")

    if str(date_value) < str(timezone.localdate()):
        return _error("Appointment date cannot be in the past.")

    if user.role == "patient":
        patient = _get_or_create_patient_profile(user)

        payload["patient"] = patient.id
        payload["status"] = "Pending"
        payload["queue_status"] = "waiting"
        payload["is_no_show"] = False

    else:
        patient_id = payload.get("patient")
        if not patient_id:
            return _error("Please choose a patient.")

    normalized_time_slot = _normalize_appointment_time_slot(time_slot)
    if not normalized_time_slot:
        return _error("Please choose a valid appointment time.")
    payload["time_slot"] = normalized_time_slot

    if normalized_time_slot not in _generate_daily_slots():
        return _error("Please select a time from the doctor schedule.")

    if doctor_id and date_value and normalized_time_slot and Appointment.objects.filter(doctor_id=doctor_id, date=date_value, time_slot=normalized_time_slot).exists():
        return _error("This doctor time slot is already booked.")

    serializer = AppointmentSerializer(data=payload)
    if serializer.is_valid():
        appointment = serializer.save()
        notification = _send_appointment_notification(appointment)
        action = "self_book_appointment" if user.role == "patient" else "create_appointment"
        _log_activity(user, action, "appointment", appointment.id, appointment.patient.user.name)
        return Response(
            {
                "message": "Appointment booked.",
                "notification": notification,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def appointment_detail(request, appointment_id):
    current_user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    appointment = Appointment.objects.select_related("patient__user", "doctor__user").filter(id=appointment_id).first()
    if not appointment:
        return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)

    if current_user.role == "doctor" and appointment.doctor.user_id != current_user.id:
        return _error("You can access only your own appointments.", status.HTTP_403_FORBIDDEN)
    if current_user.role == "patient" and appointment.patient.user_id != current_user.id:
        return _error("You can access only your own appointments.", status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response(AppointmentSerializer(appointment).data)

    if request.method == "PUT":
        if current_user.role not in {"frontdesk", "doctor", "admin", "patient"}:
            return _error("You do not have permission to update appointments.", status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        if current_user.role == "patient":
            requested_date = payload.get("date", appointment.date.isoformat())
            parsed_date = _parse_date(requested_date)
            if not parsed_date:
                return _error("Please choose a valid appointment date.")
            if parsed_date < timezone.localdate():
                return _error("Appointment date cannot be in the past.")

            requested_doctor_id = payload.get("doctor", appointment.doctor_id)
            requested_time_slot = _normalize_appointment_time_slot(payload.get("time_slot", appointment.time_slot))
            if not requested_time_slot:
                return _error("Please choose a valid appointment time.")
            if requested_time_slot not in _generate_daily_slots():
                return _error("Please select a time from the doctor schedule.")

            conflicting_appointment = Appointment.objects.filter(
                doctor_id=requested_doctor_id,
                date=parsed_date,
                time_slot=requested_time_slot,
            ).exclude(id=appointment.id).exists()
            if conflicting_appointment:
                return _error("This doctor time slot is already booked.")

            payload = {
                "doctor": requested_doctor_id,
                "date": parsed_date.isoformat(),
                "time_slot": requested_time_slot,
                "status": "Pending",
                "queue_status": "waiting",
                "is_no_show": False,
            }
        else:
            queue_status = payload.get("queue_status")
            status_value = payload.get("status")
            if queue_status in {"checked_in", "in_consultation", "completed"} or status_value == "Completed":
                payload["is_no_show"] = False

        serializer = AppointmentSerializer(appointment, data=payload, partial=True)
        if serializer.is_valid():
            updated_appointment = serializer.save()
            action = "patient_reschedule_appointment" if current_user.role == "patient" else "update_appointment"
            _log_activity(current_user, action, "appointment", updated_appointment.id, updated_appointment.patient.user.name)
            return Response({"message": "Appointment updated."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if current_user.role not in {"frontdesk", "admin", "patient"}:
        return _error("Only admin, front-desk, or patient can delete appointments.", status.HTTP_403_FORBIDDEN)

    appointment.delete()
    action = "patient_cancel_appointment" if current_user.role == "patient" else "delete_appointment"
    _log_activity(current_user, action, "appointment", appointment_id, "")
    return Response({"message": "Appointment cancelled." if current_user.role == "patient" else "Appointment deleted."})


@api_view(["GET", "POST"])
def billing(request):
    user, error = _require_role(request, "admin", "frontdesk", "patient")
    if error:
        return error

    if request.method == "GET":
        queryset = Billing.objects.select_related("patient__user", "appointment").order_by("-created_at", "-id")

        if user.role == "patient":
            queryset = queryset.filter(patient__user=user)
        else:
            patient_user_id = request.query_params.get("patient_user_id")
            status_filter = request.query_params.get("status")
            if patient_user_id:
                queryset = queryset.filter(patient__user_id=patient_user_id)
            if status_filter:
                queryset = queryset.filter(status=status_filter)

        return Response(BillingSerializer(queryset, many=True).data)

    if user.role != "frontdesk":
        return _error("Only front-desk can generate billing.", status.HTTP_403_FORBIDDEN)

    payload = request.data.copy()
    appointment_id = payload.get("appointment")
    if not appointment_id:
        return _error("Please select an appointment.")

    appointment = Appointment.objects.select_related("patient__user").filter(id=appointment_id).first()
    if not appointment:
        return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)
    if str(payload.get("patient")) != str(appointment.patient_id):
        return _error("Selected patient does not match the appointment.")
    if Billing.objects.filter(appointment=appointment).exists():
        return _error("Bill already exists for this appointment.")

    payload["invoice_number"] = _invoice_number()
    serializer = BillingSerializer(data=payload)
    if serializer.is_valid():
        bill = serializer.save()
        patient = Patient.objects.select_related("user").get(id=bill.patient_id)
        notification = _send_billing_notification(patient, bill)
        _log_activity(user, "create_bill", "billing", bill.id, bill.invoice_number)
        return Response(
            {
                "message": "Bill generated.",
                "invoice_number": bill.invoice_number,
                "notification": notification,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def billing_detail(request, bill_id):
    current_user, error = _require_role(request, "admin", "frontdesk", "patient")
    if error:
        return error

    bill = Billing.objects.select_related("patient__user", "appointment").filter(id=bill_id).first()
    if not bill:
        return _error("Bill not found.", status.HTTP_404_NOT_FOUND)

    if current_user.role == "patient" and bill.patient.user_id != current_user.id:
        return _error("You can access only your own bills.", status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response(BillingSerializer(bill).data)

    if request.method == "PUT":
        if current_user.role not in {"frontdesk", "admin"}:
            return _error("Only staff can update bills.", status.HTTP_403_FORBIDDEN)
        payload = request.data.copy()
        payload["appointment"] = bill.appointment_id
        payload["patient"] = bill.patient_id
        serializer = BillingSerializer(bill, data=payload, partial=True)
        if serializer.is_valid():
            serializer.save()
            _log_activity(current_user, "update_bill", "billing", bill.id, bill.invoice_number)
            return Response({"message": "Bill updated."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if current_user.role not in {"frontdesk", "admin"}:
        return _error("Only admin or front-desk can delete bills.", status.HTTP_403_FORBIDDEN)

    bill.delete()
    _log_activity(current_user, "delete_bill", "billing", bill_id, "")
    return Response({"message": "Bill deleted."})


@api_view(["GET"])
def billing_invoice(request, bill_id):
    current_user, error = _require_role(request, "admin", "frontdesk", "patient")
    if error:
        return error

    bill = Billing.objects.select_related("patient__user").filter(id=bill_id).first()
    if not bill:
        return _error("Bill not found.", status.HTTP_404_NOT_FOUND)

    if current_user.role == "patient" and bill.patient.user_id != current_user.id:
        return _error("You can access only your own invoice.", status.HTTP_403_FORBIDDEN)

    amount_value = f"{bill.amount:.2f}".rstrip("0").rstrip(".")
    hospital_name = html.escape(_hospital_name())
    invoice_number = html.escape(bill.invoice_number or "-")
    patient_name = html.escape(bill.patient.user.name)
    mobile_number = html.escape(bill.patient.user.mobile_number or "-")
    status_text = html.escape(bill.status)
    issued_at = html.escape(bill.created_at.strftime('%Y-%m-%d %H:%M'))
    notes_html = ""
    if bill.notes and bill.notes.strip():
        notes_html = f"""
            <div class="row notes-row">
                <span class="label">Notes</span>
                <span class="value">{html.escape(bill.notes)}</span>
            </div>
        """

    invoice_html = f"""
    <html>
        <head>
            <title>{invoice_number}</title>
            <style>
                body {{
                    margin: 0;
                    padding: 32px;
                    font-family: Arial, sans-serif;
                    background:
                        radial-gradient(circle at top left, #dbeafe 0%, transparent 28%),
                        radial-gradient(circle at bottom right, #bfdbfe 0%, transparent 26%),
                        linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #e0f2fe 100%);
                    color: #0f172a;
                }}
                .invoice-shell {{
                    max-width: 860px;
                    margin: 0 auto;
                }}
                .invoice-card {{
                    background: rgba(255, 255, 255, 0.92);
                    border: 1px solid #cbd5e1;
                    border-radius: 28px;
                    overflow: hidden;
                    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.16);
                }}
                .hero {{
                    padding: 36px 40px 28px;
                    background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%);
                    color: #ffffff;
                }}
                .eyebrow {{
                    margin: 0 0 10px;
                    font-size: 12px;
                    letter-spacing: 0.35em;
                    text-transform: uppercase;
                    opacity: 0.78;
                }}
                h1 {{
                    margin: 0;
                    font-size: 38px;
                    line-height: 1.1;
                }}
                .invoice-id {{
                    margin: 14px 0 0;
                    font-size: 18px;
                    font-weight: 700;
                }}
                .content {{
                    padding: 32px 40px 40px;
                }}
                .summary {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 16px;
                    margin-bottom: 28px;
                }}
                .summary-card {{
                    padding: 18px 20px;
                    border-radius: 20px;
                    background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
                    border: 1px solid #dbeafe;
                }}
                .summary-label {{
                    margin: 0 0 8px;
                    font-size: 12px;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: #64748b;
                }}
                .summary-value {{
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                }}
                .details {{
                    border: 1px solid #e2e8f0;
                    border-radius: 22px;
                    background: #ffffff;
                    padding: 8px 24px;
                }}
                .row {{
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    padding: 18px 0;
                    border-bottom: 1px solid #e2e8f0;
                }}
                .row:last-child {{
                    border-bottom: none;
                }}
                .label {{
                    color: #64748b;
                    font-weight: 700;
                }}
                .value {{
                    text-align: right;
                    font-weight: 600;
                    color: #0f172a;
                }}
                .notes-row {{
                    align-items: flex-start;
                }}
                .notes-row .value {{
                    max-width: 60%;
                    white-space: pre-wrap;
                }}
                @media (max-width: 640px) {{
                    body {{
                        padding: 16px;
                    }}
                    .hero, .content {{
                        padding-left: 22px;
                        padding-right: 22px;
                    }}
                    .row {{
                        flex-direction: column;
                        gap: 8px;
                    }}
                    .value, .notes-row .value {{
                        max-width: 100%;
                        text-align: left;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="invoice-shell">
                <div class="invoice-card">
                    <div class="hero">
                        <p class="eyebrow">Billing Invoice</p>
                        <h1>{hospital_name}</h1>
                        <p class="invoice-id">Invoice {invoice_number}</p>
                    </div>
                    <div class="content">
                        <div class="summary">
                            <div class="summary-card">
                                <p class="summary-label">Amount</p>
                                <p class="summary-value">{amount_value} ₹</p>
                            </div>
                            <div class="summary-card">
                                <p class="summary-label">Status</p>
                                <p class="summary-value">{status_text}</p>
                            </div>
                            <div class="summary-card">
                                <p class="summary-label">Issued On</p>
                                <p class="summary-value">{issued_at}</p>
                            </div>
                        </div>
                        <div class="details">
                            <div class="row">
                                <span class="label">Patient Name</span>
                                <span class="value">{patient_name}</span>
                            </div>
                            <div class="row">
                                <span class="label">Mobile No.</span>
                                <span class="value">{mobile_number}</span>
                            </div>
                            <div class="row">
                                <span class="label">Amount</span>
                                <span class="value">{amount_value} ₹</span>
                            </div>
                            <div class="row">
                                <span class="label">Status</span>
                                <span class="value">{status_text}</span>
                            </div>
                            <div class="row">
                                <span class="label">Date</span>
                                <span class="value">{issued_at}</span>
                            </div>
                            {notes_html}
                        </div>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """
    return HttpResponse(invoice_html)


@api_view(["GET", "POST"])
def prescriptions(request):
    current_user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    if request.method == "GET":
        queryset = Prescription.objects.select_related("doctor__user", "patient__user", "appointment").order_by("-created_at")
        if current_user.role == "doctor":
            queryset = queryset.filter(doctor__user=current_user)
        elif current_user.role == "patient":
            queryset = queryset.filter(patient__user=current_user)
        else:
            patient_user_id = request.query_params.get("patient_user_id")
            doctor_user_id = request.query_params.get("doctor_user_id")
            if patient_user_id:
                queryset = queryset.filter(patient__user_id=patient_user_id)
            if doctor_user_id:
                queryset = queryset.filter(doctor__user_id=doctor_user_id)
        return Response(PrescriptionSerializer(queryset, many=True).data)

    if current_user.role != "doctor":
        return _error("Only doctors can create prescriptions.", status.HTTP_403_FORBIDDEN)

    doctor = Doctor.objects.filter(user=current_user).first()
    if not doctor:
        return _error("Doctor profile not found.", status.HTTP_404_NOT_FOUND)

    payload = request.data.copy()
    payload["doctor"] = doctor.id
    appointment_id = payload.get("appointment")
    if not appointment_id:
        return _error("Please select an appointment.")

    appointment = Appointment.objects.select_related("patient__user").filter(id=appointment_id, doctor=doctor).first()
    if not appointment:
        return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)
    if str(payload.get("patient")) != str(appointment.patient_id):
        return _error("Selected patient does not match the appointment.")
    if appointment.status == "Completed" or appointment.queue_status == "completed":
        return _error("This visit is already completed. Book a new appointment for another prescription.")
    if Prescription.objects.filter(appointment=appointment).exists():
        return _error("Prescription already exists for this appointment.")

    serializer = PrescriptionSerializer(data=payload)
    if serializer.is_valid():
        prescription = serializer.save()
        _log_activity(current_user, "create_prescription", "prescription", prescription.id, prescription.patient.user.name)
        return Response({"message": "Prescription saved."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
def medical_records(request):
    current_user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    if request.method == "GET":
        queryset = MedicalRecord.objects.select_related("patient__user", "uploaded_by").order_by("-created_at")
        if current_user.role == "patient":
            queryset = queryset.filter(patient__user=current_user)
        else:
            patient_user_id = request.query_params.get("patient_user_id")
            if patient_user_id:
                queryset = queryset.filter(patient__user_id=patient_user_id)
        return Response(MedicalRecordSerializer(queryset, many=True).data)

    if current_user.role not in {"frontdesk", "doctor"}:
        return _error("Only front-desk or doctor can upload records.", status.HTTP_403_FORBIDDEN)

    payload = request.data.copy()
    payload["uploaded_by"] = current_user.id
    serializer = MedicalRecordSerializer(data=payload)
    if serializer.is_valid():
        record = serializer.save()
        _log_activity(current_user, "upload_medical_record", "medical_record", record.id, record.title)
        return Response({"message": "Medical record uploaded."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
def admissions(request):
    current_user, error = _require_role(request, "admin", "frontdesk", "doctor")
    if error:
        return error

    if request.method == "GET":
        queryset = Admission.objects.select_related(
            "patient__user",
            "doctor__user",
            "appointment",
            "created_by",
            "updated_by",
        ).order_by("-admitted_at", "-id")

        if current_user.role == "doctor":
            queryset = queryset.filter(doctor__user=current_user)
        else:
            status_filter = request.query_params.get("status")
            doctor_user_id = request.query_params.get("doctor_user_id")
            patient_user_id = request.query_params.get("patient_user_id")
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if doctor_user_id:
                queryset = queryset.filter(doctor__user_id=doctor_user_id)
            if patient_user_id:
                queryset = queryset.filter(patient__user_id=patient_user_id)

        return Response(AdmissionSerializer(queryset, many=True).data)

    payload = request.data.copy()
    patient_id = payload.get("patient")
    appointment_id = payload.get("appointment")

    if current_user.role == "doctor":
        doctor = Doctor.objects.filter(user=current_user).first()
        if not doctor:
            return _error("Doctor profile not found.", status.HTTP_404_NOT_FOUND)
        payload["doctor"] = doctor.id
    elif not payload.get("doctor"):
        return _error("Please select a doctor.")

    if not patient_id:
        return _error("Please select a patient.")

    patient = Patient.objects.select_related("user").filter(id=patient_id).first()
    if not patient:
        return _error("Patient not found.", status.HTTP_404_NOT_FOUND)

    selected_doctor = Doctor.objects.select_related("user").filter(id=payload.get("doctor")).first()
    if not selected_doctor:
        return _error("Doctor not found.", status.HTTP_404_NOT_FOUND)

    appointment = None
    if appointment_id:
        appointment = Appointment.objects.filter(id=appointment_id).first()
        if not appointment:
            return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)
        if appointment.patient_id != patient.id:
            return _error("Selected appointment does not match the patient.")
        if appointment.doctor_id != selected_doctor.id:
            return _error("Selected appointment does not match the doctor.")

    active_admission = Admission.objects.filter(patient=patient, status="admitted").first()
    if active_admission:
        return _error("This patient is already admitted.")

    payload["created_by"] = current_user.id
    payload["updated_by"] = current_user.id
    if not payload.get("room_type"):
        payload["room_type"] = "non_ac"
    if not payload.get("status"):
        payload["status"] = "admitted"
    if payload.get("status") == "discharged" and not payload.get("discharged_at"):
        payload["discharged_at"] = timezone.now().isoformat()

    serializer = AdmissionSerializer(data=payload)
    if serializer.is_valid():
        admission = serializer.save()
        _log_activity(current_user, "create_admission", "admission", admission.id, admission.patient.user.name)
        return Response({"message": "Patient admitted successfully."}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
def admission_detail(request, admission_id):
    current_user, error = _require_role(request, "admin", "frontdesk", "doctor")
    if error:
        return error

    admission = Admission.objects.select_related(
        "patient__user",
        "doctor__user",
        "appointment",
        "created_by",
        "updated_by",
    ).filter(id=admission_id).first()
    if not admission:
        return _error("Admission not found.", status.HTTP_404_NOT_FOUND)

    if current_user.role == "doctor" and admission.doctor.user_id != current_user.id:
        return _error("You can access only your own admitted patients.", status.HTTP_403_FORBIDDEN)

    if request.method == "GET":
        return Response(AdmissionSerializer(admission).data)

    if request.method == "PUT":
        payload = request.data.copy()

        if current_user.role == "doctor":
            doctor = Doctor.objects.filter(user=current_user).first()
            if not doctor or admission.doctor_id != doctor.id:
                return _error("You can update only your own admitted patients.", status.HTTP_403_FORBIDDEN)
            payload["doctor"] = admission.doctor_id

        patient_id = payload.get("patient", admission.patient_id)
        doctor_id = payload.get("doctor", admission.doctor_id)
        appointment_id = payload.get("appointment", admission.appointment_id)

        patient = Patient.objects.filter(id=patient_id).first()
        if not patient:
            return _error("Patient not found.", status.HTTP_404_NOT_FOUND)

        doctor = Doctor.objects.filter(id=doctor_id).first()
        if not doctor:
            return _error("Doctor not found.", status.HTTP_404_NOT_FOUND)

        if appointment_id:
            appointment = Appointment.objects.filter(id=appointment_id).first()
            if not appointment:
                return _error("Appointment not found.", status.HTTP_404_NOT_FOUND)
            if appointment.patient_id != patient.id or appointment.doctor_id != doctor.id:
                return _error("Appointment must match selected patient and doctor.")

        duplicate_active = Admission.objects.filter(patient_id=patient_id, status="admitted").exclude(id=admission.id).exists()
        next_status = payload.get("status", admission.status)
        if next_status == "admitted" and duplicate_active:
            return _error("This patient already has another active admission.")

        payload["updated_by"] = current_user.id
        if next_status == "discharged":
            payload["discharged_at"] = payload.get("discharged_at") or timezone.now().isoformat()
        elif "status" in payload and next_status == "admitted":
            payload["discharged_at"] = None

        serializer = AdmissionSerializer(admission, data=payload, partial=True)
        if serializer.is_valid():
            updated_admission = serializer.save()
            _log_activity(current_user, "update_admission", "admission", updated_admission.id, updated_admission.patient.user.name)
            return Response({"message": "Admission updated."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if current_user.role not in {"admin", "frontdesk"}:
        return _error("Only admin or front-desk can delete admissions.", status.HTTP_403_FORBIDDEN)

    admission.delete()
    _log_activity(current_user, "delete_admission", "admission", admission_id, "")
    return Response({"message": "Admission deleted."})


@api_view(["GET"])
def activity_logs(request):
    current_user, error = _require_role(request, "admin")
    if error:
        return error

    queryset = ActivityLog.objects.select_related("actor").order_by("-created_at")[:100]
    return Response(ActivityLogSerializer(queryset, many=True).data)


@api_view(["GET"])
def doctor_dashboard(request):
    user, error = _require_role(request, "doctor")
    if error:
        return error

    doctor = Doctor.objects.select_related("user").filter(user=user).first()
    if not doctor:
        return _error("Doctor profile not found.", status.HTTP_404_NOT_FOUND)

    appointments_queryset = Appointment.objects.select_related("patient__user", "doctor__user").filter(doctor=doctor).order_by("-date", "-time_slot")
    patients_queryset = Patient.objects.select_related("user").filter(appointment__doctor=doctor).distinct().order_by("user__name")
    prescriptions_queryset = Prescription.objects.select_related("patient__user", "doctor__user").filter(doctor=doctor).order_by("-created_at")[:10]
    admissions_queryset = Admission.objects.select_related("patient__user", "doctor__user", "appointment", "created_by", "updated_by").filter(doctor=doctor).order_by("-admitted_at", "-id")

    return Response(
        {
            "doctor": DoctorSerializer(doctor).data,
            "patients": PatientSerializer(patients_queryset, many=True).data,
            "appointments": AppointmentSerializer(appointments_queryset, many=True).data,
            "prescriptions": PrescriptionSerializer(prescriptions_queryset, many=True).data,
            "admissions": AdmissionSerializer(admissions_queryset, many=True).data,
        }
    )


@api_view(["GET"])
def patient_dashboard(request):
    user, error = _require_role(request, "patient")
    if error:
        return error

    patient = _get_or_create_patient_profile(user)

    appointments_queryset = Appointment.objects.select_related("doctor__user", "patient__user").filter(patient=patient).order_by("-date", "-time_slot")
    billing_queryset = Billing.objects.select_related("patient__user").filter(patient=patient).order_by("-created_at", "-id")
    prescriptions_queryset = Prescription.objects.select_related("doctor__user", "patient__user").filter(patient=patient).order_by("-created_at")
    records_queryset = MedicalRecord.objects.select_related("patient__user", "uploaded_by").filter(patient=patient).order_by("-created_at")

    return Response(
        {
            "patient": PatientSerializer(patient).data,
            "appointments": AppointmentSerializer(appointments_queryset, many=True).data,
            "billing": BillingSerializer(billing_queryset, many=True).data,
            "prescriptions": PrescriptionSerializer(prescriptions_queryset, many=True).data,
            "medical_records": MedicalRecordSerializer(records_queryset, many=True).data,
            "family_links": FamilyAccessSerializer(
                FamilyAccess.objects.select_related("attendant_user", "patient__user").filter(patient=patient).order_by("-created_at"),
                many=True,
            ).data,
        }
    )


@api_view(["GET"])
def attendant_dashboard(request):
    user, error = _require_role(request, "attendant")
    if error:
        return error

    links = FamilyAccess.objects.select_related("patient__user").filter(attendant_user=user).order_by("patient__user__name")
    patient_ids = list(links.values_list("patient_id", flat=True))
    patients = Patient.objects.select_related("user").filter(id__in=patient_ids).order_by("user__name")
    appointments = Appointment.objects.select_related("doctor__user", "patient__user").filter(patient_id__in=patient_ids).order_by("-date", "-time_slot")
    billing_entries = Billing.objects.select_related("patient__user", "appointment").filter(patient_id__in=patient_ids).order_by("-created_at", "-id")
    prescriptions = Prescription.objects.select_related("doctor__user", "patient__user", "appointment").filter(patient_id__in=patient_ids).order_by("-created_at")
    records = MedicalRecord.objects.select_related("patient__user", "uploaded_by").filter(patient_id__in=patient_ids).order_by("-created_at")

    return Response(
        {
            "attendant": {
                "id": user.id,
                "name": user.name,
                "mobile_number": user.mobile_number,
                "email": user.email,
            },
            "links": FamilyAccessSerializer(links, many=True).data,
            "patients": PatientSerializer(patients, many=True).data,
            "appointments": AppointmentSerializer(appointments, many=True).data,
            "billing": BillingSerializer(billing_entries, many=True).data,
            "prescriptions": PrescriptionSerializer(prescriptions[:20], many=True).data,
            "medical_records": MedicalRecordSerializer(records[:20], many=True).data,
        }
    )


@api_view(["GET"])
def secure_data(request):
    user, error = _require_role(request, "admin", "frontdesk", "doctor", "patient")
    if error:
        return error

    return Response({"message": f"Secure Data Accessed for {user.name}"})
