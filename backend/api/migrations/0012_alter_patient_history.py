from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_admission"),
    ]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="history",
            field=models.TextField(blank=True, default=""),
        ),
    ]
