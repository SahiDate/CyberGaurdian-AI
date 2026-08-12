from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('scanner', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='scanresult',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='scan_results', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddIndex(
            model_name='scanresult',
            index=models.Index(fields=['risk_level'], name='scanner_sca_risk_le_521021_idx'),
        ),
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('report_type', models.CharField(default='EXECUTIVE', max_length=50)),
                ('summary', models.TextField(blank=True)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(default='GENERATED', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('scan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='scanner.scanresult')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ThreatIntelResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('target', models.CharField(max_length=512)),
                ('threat_type', models.CharField(default='VULNERABILITY', max_length=100)),
                ('severity', models.CharField(default='MEDIUM', max_length=20)),
                ('indicator_count', models.IntegerField(default=0)),
                ('raw_data', models.JSONField(blank=True, default=dict)),
                ('detected_at', models.DateTimeField(auto_now_add=True)),
                ('scan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='threat_results', to='scanner.scanresult')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='threat_results', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-detected_at'],
            },
        ),
        migrations.CreateModel(
            name='FileAnalysis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('filename', models.CharField(max_length=255)),
                ('file_hash', models.CharField(blank=True, max_length=64)),
                ('file_size', models.BigIntegerField(default=0)),
                ('file_type', models.CharField(blank=True, max_length=100)),
                ('analysis_result', models.JSONField(blank=True, default=dict)),
                ('risk_level', models.CharField(default='clean', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='file_analyses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Incident',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('severity', models.CharField(default='MEDIUM', max_length=20)),
                ('status', models.CharField(default='OPEN', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assigned_to', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_incidents', to=settings.AUTH_USER_MODEL)),
                ('scan', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='incidents', to='scanner.scanresult')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incidents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AIActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('request_text', models.TextField()),
                ('target', models.CharField(blank=True, max_length=512)),
                ('tools_selected', models.JSONField(blank=True, default=list)),
                ('execution_status', models.CharField(default='COMPLETED', max_length=30)),
                ('result_summary', models.TextField(blank=True)),
                ('risk_score', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_activities', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='report',
            index=models.Index(fields=['user', '-created_at'], name='scanner_rep_user_id_c683b5_idx'),
        ),
        migrations.AddIndex(
            model_name='threatintelresult',
            index=models.Index(fields=['user', '-detected_at'], name='scanner_thr_user_id_10795c_idx'),
        ),
        migrations.AddIndex(
            model_name='threatintelresult',
            index=models.Index(fields=['severity'], name='scanner_thr_severit_3ff03e_idx'),
        ),
        migrations.AddIndex(
            model_name='fileanalysis',
            index=models.Index(fields=['user', '-created_at'], name='scanner_fil_user_id_9f8d67_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['user', '-created_at'], name='scanner_inc_user_id_6a5f78_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['status'], name='scanner_inc_status_b13d29_idx'),
        ),
        migrations.AddIndex(
            model_name='incident',
            index=models.Index(fields=['severity'], name='scanner_inc_severit_8172df_idx'),
        ),
        migrations.AddIndex(
            model_name='aiactivity',
            index=models.Index(fields=['user', '-created_at'], name='scanner_aia_user_id_5b38e1_idx'),
        ),
    ]
