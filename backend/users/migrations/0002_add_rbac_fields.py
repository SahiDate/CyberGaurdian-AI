from django.db import migrations, connection
from django.contrib.auth.hashers import make_password


def get_existing_columns(table_name):
    """Return set of column names that already exist in the table across all database backends."""
    with connection.cursor() as cursor:
        if connection.vendor == 'sqlite':
            cursor.execute(f"PRAGMA table_info(`{table_name}`)")
            return {row[1] for row in cursor.fetchall()}
        elif connection.vendor == 'postgresql':
            cursor.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
                [table_name]
            )
            return {row[0] for row in cursor.fetchall()}
        else:  # MySQL
            cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
            return {row[0] for row in cursor.fetchall()}


def add_rbac_columns(apps, schema_editor):
    """Safely add RBAC columns only if they don't already exist."""
    table = 'users_user'
    existing = get_existing_columns(table)

    with connection.cursor() as cursor:
        if connection.vendor == 'sqlite':
            dt_type = "DATETIME"
            dt_default = "'2026-01-01 00:00:00'"
            q = '`'
        elif connection.vendor == 'postgresql':
            dt_type = "TIMESTAMP WITH TIME ZONE"
            dt_default = "NOW()"
            q = '"'
        else:
            dt_type = "DATETIME(6)"
            dt_default = "NOW()"
            q = '`'

        if 'role' not in existing:
            cursor.execute(
                f"ALTER TABLE {q}{table}{q} ADD COLUMN {q}role{q} VARCHAR(20) NOT NULL DEFAULT 'USER'"
            )

        if 'status' not in existing:
            cursor.execute(
                f"ALTER TABLE {q}{table}{q} ADD COLUMN {q}status{q} VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'"
            )

        if 'created_at' not in existing:
            cursor.execute(
                f"ALTER TABLE {q}{table}{q} ADD COLUMN {q}created_at{q} {dt_type} NOT NULL DEFAULT {dt_default}"
            )

        if 'updated_at' not in existing:
            cursor.execute(
                f"ALTER TABLE {q}{table}{q} ADD COLUMN {q}updated_at{q} {dt_type} NOT NULL DEFAULT {dt_default}"
            )


def remove_rbac_columns(apps, schema_editor):
    """Reverse: drop RBAC columns if they exist."""
    table = 'users_user'
    existing = get_existing_columns(table)
    q = '"' if connection.vendor == 'postgresql' else '`'

    with connection.cursor() as cursor:
        for col in ('role', 'status', 'created_at', 'updated_at'):
            if col in existing:
                cursor.execute(f"ALTER TABLE {q}{table}{q} DROP COLUMN {q}{col}{q}")


def seed_admin_user(apps, schema_editor):
    """Seed initial admin account if not already present."""
    User = apps.get_model('users', 'User')
    if not User.objects.filter(username='admin').exists():
        u = User.objects.create(
            username='admin',
            email='admin@cyberguardian.io',
            password=make_password('AdminPassword123!'),
            is_active=True,
            is_email_verified=True,
            is_staff=True,
            is_superuser=True
        )
        with connection.cursor() as cursor:
            q = '"' if connection.vendor in ('postgresql', 'sqlite') else '`'
            cursor.execute(f"UPDATE {q}users_user{q} SET {q}role{q}='ADMIN', {q}status{q}='ACTIVE' WHERE {q}id{q}=%s", [u.id])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Step 1: safely add columns using Python introspection (works on PostgreSQL, MySQL, SQLite)
        migrations.RunPython(add_rbac_columns, remove_rbac_columns),

        # Step 2: seed initial admin account
        migrations.RunPython(seed_admin_user, migrations.RunPython.noop),
    ]
