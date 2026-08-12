from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ScanResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.CharField(help_text='Original user input', max_length=2048)),
                ('domain', models.CharField(help_text='Normalized domain extracted from URL', max_length=512)),
                ('is_https', models.BooleanField(default=False)),
                ('security_score', models.IntegerField(default=0, help_text='0-100 composite security score')),
                ('risk_level', models.CharField(
                    choices=[('excellent', 'Excellent'), ('good', 'Good'), ('medium', 'Medium Risk'), ('high', 'High Risk')],
                    default='high',
                    max_length=20
                )),
                ('ssl_data', models.JSONField(blank=True, default=dict)),
                ('headers_data', models.JSONField(blank=True, default=dict)),
                ('dns_data', models.JSONField(blank=True, default=dict)),
                ('whois_data', models.JSONField(blank=True, default=dict)),
                ('robots_data', models.JSONField(blank=True, default=dict)),
                ('scanned_at', models.DateTimeField(auto_now_add=True)),
                ('scan_duration_ms', models.IntegerField(default=0, help_text='Total scan duration in milliseconds')),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='scan_results',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'ordering': ['-scanned_at'],
                'indexes': [
                    models.Index(fields=['user', '-scanned_at'], name='scanner_sca_user_id_idx'),
                    models.Index(fields=['domain'], name='scanner_sca_domain_idx'),
                ],
            },
        ),
    ]
