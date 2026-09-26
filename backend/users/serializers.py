from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 
            'role', 'status', 'is_email_verified', 
            'is_active', 'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'role', 'created_at', 'last_login']

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add enterprise custom claims inside JWT payload
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        token['status'] = user.status
        token['user_id'] = user.id
        return token

import re

class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        max_length=150,
        required=True,
        validators=[]  # Handled in validate_username to allow re-registration of unverified accounts
    )
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        min_length=6,
        error_messages={
            'min_length': 'Password must be at least 6 characters long.',
            'blank': 'Password is required.'
        }
    )
    phone_number = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number']

    def validate_username(self, value):
        val = re.sub(r'\s+', ' ', value.strip())
        if not re.match(r'^[\w\s.@+-]+$', val):
            raise serializers.ValidationError(
                "Username may only contain letters, numbers, spaces, and @/./+/-/_ characters."
            )
        # Check if an ACTIVE user already has this username
        active_user = User.objects.filter(username__iexact=val, is_active=True).first()
        if active_user:
            raise serializers.ValidationError("An active account with this username already exists. Please log in.")
        return val

    def validate_email(self, value):
        val = value.strip().lower()
        active_user = User.objects.filter(email__iexact=val, is_active=True).first()
        if active_user:
            raise serializers.ValidationError("An account with this email address already exists. Please log in.")
        return val

    def validate_phone_number(self, value):
        if not value:
            return ""
        # Clean formatting spaces/dashes if any
        val = value.strip()
        # Keep digits and leading +
        cleaned = re.sub(r'[^\d+]', '', val)
        return cleaned[:20]

    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        password = validated_data['password']
        phone_number = validated_data.get('phone_number', '')

        # Check if an unverified user already exists with this username or email
        unverified_user = User.objects.filter(username__iexact=username, is_active=False).first()
        if not unverified_user:
            unverified_user = User.objects.filter(email__iexact=email, is_active=False).first()

        if unverified_user:
            unverified_user.username = username
            unverified_user.email = email
            unverified_user.set_password(password)
            unverified_user.phone_number = phone_number
            unverified_user.role = 'USER'
            unverified_user.status = 'ACTIVE'
            unverified_user.is_active = False
            unverified_user.save()
            return unverified_user

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            phone_number=phone_number,
            role='USER',
            status='ACTIVE',
            is_active=False
        )
        return user

class AdminUserManagementSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number', 
            'role', 'status', 'is_active', 'is_email_verified',
            'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']


class NotificationSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        from .models import Notification
        model = Notification
        fields = [
            'id', 'user_id', 'username', 'title', 'message',
            'notification_type', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin_id = serializers.ReadOnlyField(source='admin.id')
    admin_username = serializers.ReadOnlyField(source='admin.username')
    target_username = serializers.ReadOnlyField(source='target_user.username')

    class Meta:
        from .models import AdminAuditLog
        model = AdminAuditLog
        fields = [
            'id', 'admin_id', 'admin_username', 'action',
            'target_user', 'target_username', 'target_record',
            'result', 'ip_address', 'timestamp'
        ]
        read_only_fields = ['id', 'admin_id', 'admin_username', 'target_username', 'timestamp']
