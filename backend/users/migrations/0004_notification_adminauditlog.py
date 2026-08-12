from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_expand_role_and_update_superadmin'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(default='INFO', max_length=50)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AdminAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(max_length=255)),
                ('target_record', models.CharField(blank=True, max_length=255)),
                ('result', models.CharField(default='SUCCESS', max_length=50)),
                ('ip_address', models.CharField(blank=True, max_length=45, null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('admin', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='admin_audit_logs', to=settings.AUTH_USER_MODEL)),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='targeted_audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read', '-created_at'], name='users_notif_user_id_44f33d_idx'),
        ),
        migrations.AddIndex(
            model_name='adminauditlog',
            index=models.Index(fields=['admin', '-timestamp'], name='users_admin_admin_i_c009d1_idx'),
        ),
        migrations.AddIndex(
            model_name='adminauditlog',
            index=models.Index(fields=['target_user', '-timestamp'], name='users_admin_target__132e01_idx'),
        ),
    ]
