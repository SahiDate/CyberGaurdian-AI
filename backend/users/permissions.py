from rest_framework.permissions import BasePermission

class IsUserRole(BasePermission):
    """
    Permission check for authenticated active user.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.status == 'ACTIVE' and
            request.user.is_active
        )

class IsAdminRole(BasePermission):
    """
    Permission check for ADMIN, SOC_ANALYST, or SUPER_ADMIN role or Django Superuser.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in ['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN'] or request.user.is_superuser or request.user.is_staff) and
            request.user.status == 'ACTIVE' and
            request.user.is_active
        )
