from django.db import migrations, connection
from django.contrib.auth.hashers import make_password


def get_existing_columns(table_name):
    """Return set of column names that already exist in the table."""
    with connection.cursor() as cursor:
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        return {row[0] for row in cursor.fetchall()}


def add_rbac_columns(apps, schema_editor):
    """Safely add RBAC columns only if they don't already exist."""
    table = 'users_user'
    existing = get_existing_columns(table)

    with connection.cursor() as cursor:
        if 'role' not in existing:
            cursor.execute(
                "ALTER TABLE `users_user` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'USER'"
            )

        if 'status' not in existing:
            cursor.execute(
                "ALTER TABLE `users_user` ADD COLUMN `status` VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'"
            )

        if 'created_at' not in existing:
            cursor.execute(
                "ALTER TABLE `users_user` ADD COLUMN `created_at` DATETIME(6) NOT NULL DEFAULT NOW()"
            )

        if 'updated_at' not in existing:
            cursor.execute(
                "ALTER TABLE `users_user` ADD COLUMN `updated_at` DATETIME(6) NOT NULL DEFAULT NOW()"
            )


def remove_rbac_columns(apps, schema_editor):
    """Reverse: drop RBAC columns if they exist."""
    table = 'users_user'
    existing = get_existing_columns(table)

    with connection.cursor() as cursor:
        for col in ('role', 'status', 'created_at', 'updated_at'):
            if col in existing:
                cursor.execute(f"ALTER TABLE `{table}` DROP COLUMN `{col}`")


def seed_admin_user(apps, schema_editor):
    """Seed initial admin account if not already present."""
    User = apps.get_model('users', 'User')
    if not User.objects.filter(username='admin').exists():
        User.objects.create(
            username='admin',
            email='admin@cyberguardian.io',
            password=make_password('AdminPassword123!'),
            role='ADMIN',
            status='ACTIVE',
            is_active=True,
            is_email_verified=True,
            is_staff=True,
            is_superuser=True
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Step 1: safely add columns using Python introspection (works on any MySQL version)
        migrations.RunPython(add_rbac_columns, remove_rbac_columns),

        # Step 2: seed initial admin account
        migrations.RunPython(seed_admin_user, migrations.RunPython.noop),
    ]
