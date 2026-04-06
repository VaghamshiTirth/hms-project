from django.contrib import admin
from .models import *

admin.site.register(User)
admin.site.register(Patient)
admin.site.register(Doctor)
admin.site.register(Appointment)
admin.site.register(Billing)
admin.site.register(Prescription)
admin.site.register(MedicalRecord)
admin.site.register(ActivityLog)
admin.site.register(AccessToken)
admin.site.register(PasswordResetOTP)
admin.site.register(PatientSignupOTP)
admin.site.register(FamilyAccess)
