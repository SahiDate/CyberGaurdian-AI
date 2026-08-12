"""
Django Admin configuration for CyberGuardian AI.

Registers the existing custom User model (users.User) which extends
Django's AbstractUser. No new model is created.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from .models import User


# ---------------------------------------------------------------------------
# Custom actions
# ---------------------------------------------------------------------------

@admin.action(description="Activate selected users")
def activate_users(modeladmin, request, queryset):
    queryset.update(is_active=True, status="ACTIVE")


@admin.action(description="Deactivate selected users")
def deactivate_users(modeladmin, request, queryset):
    queryset.update(is_active=False, status="INACTIVE")


@admin.action(description="Suspend selected users")
def suspend_users(modeladmin, request, queryset):
    queryset.update(status="SUSPENDED")


@admin.action(description="Assign role: USER")
def assign_role_user(modeladmin, request, queryset):
    queryset.update(role="USER")


@admin.action(description="Assign role: ADMIN")
def assign_role_admin(modeladmin, request, queryset):
    queryset.update(role="ADMIN")


@admin.action(description="Assign role: SOC_ANALYST")
def assign_role_soc(modeladmin, request, queryset):
    queryset.update(role="SOC_ANALYST")


@admin.action(description="Assign role: SUPER_ADMIN")
def assign_role_super_admin(modeladmin, request, queryset):
    queryset.update(role="SUPER_ADMIN")


@admin.action(description="Reset password to default (CyberGuardian@123)")
def reset_user_passwords(modeladmin, request, queryset):
    for user in queryset:
        user.set_password("CyberGuardian@123")
        user.save()


# ---------------------------------------------------------------------------
# UserAdmin
# ---------------------------------------------------------------------------

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin panel for the custom CyberGuardian User model.
    Extends Django's built-in UserAdmin so password hashing and
    change-password forms continue to work out of the box.
    """

    # ------------------------------------------------------------------
    # List view
    # ------------------------------------------------------------------
    list_display = (
        "id",
        "username",
        "email",
        "get_full_name_display",
        "phone_number",
        "role",
        "status",
        "is_active",
        "is_email_verified",
        "date_joined",
        "last_login",
    )

    list_display_links = ("id", "username")

    list_filter = (
        "role",
        "status",
        "is_active",
        "is_staff",
        "is_superuser",
        "is_email_verified",
        "date_joined",
        "last_login",
    )

    search_fields = (
        "username",
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = ("-date_joined",)

    list_per_page = 25

    list_editable = ("role", "status", "is_active")

    readonly_fields = (
        "id",
        "date_joined",
        "last_login",
        "created_at",
        "updated_at",
        "otp",
        "otp_created_at",
    )

    actions = [
        activate_users,
        deactivate_users,
        suspend_users,
        assign_role_user,
        assign_role_admin,
        assign_role_soc,
        assign_role_super_admin,
        reset_user_passwords,
    ]

    # ------------------------------------------------------------------
    # Detail / change form - fieldsets
    # ------------------------------------------------------------------
    fieldsets = (
        # Personal Information
        (
            _("Personal Information"),
            {
                "fields": (
                    "id",
                    "username",
                    "first_name",
                    "last_name",
                    "email",
                    "phone_number",
                ),
            },
        ),
        # Authentication
        (
            _("Authentication"),
            {
                "fields": ("password",),
                "classes": ("collapse",),
            },
        ),
        # Email Verification & OTP
        (
            _("Email Verification & OTP"),
            {
                "fields": (
                    "is_email_verified",
                    "otp",
                    "otp_created_at",
                ),
                "classes": ("collapse",),
            },
        ),
        # Role & Status
        (
            _("Role & Status"),
            {
                "fields": ("role", "status"),
            },
        ),
        # Permissions
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        # Important Dates
        (
            _("Important Dates"),
            {
                "fields": (
                    "last_login",
                    "date_joined",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    # Fieldsets shown on the "Add user" form
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "first_name",
                    "last_name",
                    "phone_number",
                    "password1",
                    "password2",
                    "role",
                    "status",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    # ------------------------------------------------------------------
    # Custom display helpers
    # ------------------------------------------------------------------

    @admin.display(description="Full Name", ordering="first_name")
    def get_full_name_display(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or "—"

    @admin.display(description="Role")
    def role_badge(self, obj):
        colors = {
            "USER": "#3b82f6",
            "ADMIN": "#f59e0b",
            "SOC_ANALYST": "#8b5cf6",
            "SUPER_ADMIN": "#ef4444",
        }
        color = colors.get(obj.role, "#6b7280")
        return format_html(
            '<span style="'
            "background:{color};"
            "color:#fff;"
            "padding:2px 8px;"
            "border-radius:4px;"
            "font-size:11px;"
            "font-weight:600;"
            '">{role}</span>',
            color=color,
            role=obj.role,
        )

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            "ACTIVE": "#10b981",
            "INACTIVE": "#6b7280",
            "SUSPENDED": "#ef4444",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="'
            "background:{color};"
            "color:#fff;"
            "padding:2px 8px;"
            "border-radius:4px;"
            "font-size:11px;"
            "font-weight:600;"
            '">{status}</span>',
            color=color,
            status=obj.status,
        )
