from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_alter_familyaccess_relation"),
    ]

    operations = [
        migrations.CreateModel(
            name="Admission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("room_number", models.CharField(blank=True, default="", max_length=30)),
                ("room_type", models.CharField(choices=[("ac", "AC"), ("non_ac", "Non AC")], default="non_ac", max_length=20)),
                ("status", models.CharField(choices=[("admitted", "Admitted"), ("discharged", "Discharged")], default="admitted", max_length=20)),
                ("admission_reason", models.TextField(blank=True, default="")),
                ("care_notes", models.TextField(blank=True, default="")),
                ("medicine_notes", models.TextField(blank=True, default="")),
                ("admitted_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("discharged_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("appointment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="api.appointment")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_admissions", to="api.user")),
                ("doctor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="api.doctor")),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="api.patient")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_admissions", to="api.user")),
            ],
        ),
    ]
