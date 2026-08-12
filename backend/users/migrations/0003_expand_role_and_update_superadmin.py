from django.db import migrations, connection

def expand_role_column(apps, schema_editor):
    """Safely expand role column size to VARCHAR(20) in MySQL/SQLite."""
    with connection.cursor() as cursor:
        if connection.vendor == 'mysql':
            cursor.execute("ALTER TABLE `users_user` MODIFY COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'USER'")


def promote_sahilraj_and_remove_admin(apps, schema_editor):
    """
    Promote Sahilraj07 to SUPER_ADMIN, is_staff=True, is_superuser=True
    and delete the temporary 'admin' user.
    """
    User = apps.get_model('users', 'User')

    # Remove temporary 'admin' user
    User.objects.filter(username='admin').delete()

    # Find Sahilraj07 (case-insensitive search) or any username matching Sahilraj07
    user = User.objects.filter(username__iexact='Sahilraj07').first()
    if not user:
        # Check if user exists with email or similar username
        user = User.objects.filter(username__icontains='sahilraj').first()

    if user:
        user.role = 'SUPER_ADMIN'
        user.status = 'ACTIVE'
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save()
    else:
        # If Sahilraj07 doesn't exist yet, create the user as SUPER_ADMIN
        from django.contrib.auth.hashers import make_password
        User.objects.create(
            username='Sahilraj07',
            email='sahilraj07@cyberguardian.io',
            password=make_password('AdminPassword123!'),
            role='SUPER_ADMIN',
            status='ACTIVE',
            is_active=True,
            is_email_verified=True,
            is_staff=True,
            is_superuser=True
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_rbac_fields'),
    ]

    operations = [
        migrations.RunPython(expand_role_column, migrations.RunPython.noop),
        migrations.RunPython(promote_sahilraj_and_remove_admin, migrations.RunPython.noop),
    ]
