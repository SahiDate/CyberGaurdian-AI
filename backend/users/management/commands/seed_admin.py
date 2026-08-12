from django.core.management.base import BaseCommand
from users.models import User

class Command(BaseCommand):
    help = 'Seeds initial default Administrator account for SOC Portal access.'

    def handle(self, *args, **options):
        admin_email = 'admin@cyberguardian.io'
        admin_username = 'admin'
        admin_password = 'AdminPassword123!'

        if not User.objects.filter(username=admin_username).exists():
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                role='ADMIN',
                status='ACTIVE',
                is_active=True,
                is_email_verified=True,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f"[✓] Successfully created initial Administrator account:"))
            self.stdout.write(self.style.SUCCESS(f"    Email: {admin_email}"))
            self.stdout.write(self.style.SUCCESS(f"    Username: {admin_username}"))
            self.stdout.write(self.style.SUCCESS(f"    Password: {admin_password}"))
            self.stdout.write(self.style.SUCCESS(f"    Role: ADMIN"))
        else:
            admin_user = User.objects.get(username=admin_username)
            admin_user.role = 'ADMIN'
            admin_user.status = 'ACTIVE'
            admin_user.is_active = True
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save()
            self.stdout.write(self.style.WARNING(f"[!] Admin user '{admin_username}' already exists. Role updated to ADMIN."))
