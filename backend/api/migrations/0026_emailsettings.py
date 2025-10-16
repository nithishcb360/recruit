# Generated manually

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_add_video_interview_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_user', models.EmailField(blank=True, max_length=254)),
                ('email_password', models.CharField(blank=True, max_length=500)),
                ('email_host', models.CharField(default='smtp.gmail.com', max_length=200)),
                ('email_port', models.IntegerField(default=587)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Email Settings',
                'verbose_name_plural': 'Email Settings',
            },
        ),
    ]
