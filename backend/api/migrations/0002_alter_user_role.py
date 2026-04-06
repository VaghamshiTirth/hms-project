from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Admin"),
                    ("frontdesk", "Front Desk"),
                    ("doctor", "Doctor"),
                    ("patient", "Patient"),
                ],
                max_length=15,
            ),
        ),
    ]
