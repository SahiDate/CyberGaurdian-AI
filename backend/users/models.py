from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'User'),
        ('ADMIN', 'Admin'),
        ('SOC_ANALYST', 'SOC Analyst'),
        ('SUPER_ADMIN', 'Super Admin'),
    )
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('SUSPENDED', 'Suspended'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACTIVE')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, default='INFO')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.user.username}] {self.title}"


class AdminAuditLog(models.Model):
    admin = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='admin_audit_logs'
    )
    action = models.CharField(max_length=255)
    target_user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='targeted_audit_logs'
    )
    target_record = models.CharField(max_length=255, blank=True)
    result = models.CharField(max_length=50, default='SUCCESS')
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['admin', '-timestamp']),
            models.Index(fields=['target_user', '-timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp}] Admin {self.admin.username}: {self.action} -> {self.target_record or self.target_user}"

