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

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number']

    def create(self, validated_data):
        # Public registration is strictly forced to USER role
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone_number=validated_data.get('phone_number', ''),
            role='USER',
            status='ACTIVE',
            is_active=False # Pending OTP verification
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
