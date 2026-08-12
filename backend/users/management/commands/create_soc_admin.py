import getpass
from django.core.management.base import BaseCommand, CommandError
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password


class Command(BaseCommand):
    help = 'Securely creates a SOC Admin or SOC Analyst account for the CyberGuardian Admin Portal.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--role',
            type=str,
            choices=['ADMIN', 'SOC_ANALYST'],
            default=None,
            help='Role to assign (ADMIN or SOC_ANALYST). Prompted if not provided.'
        )
        parser.add_argument(
            '--username',
            type=str,
            default=None,
            help='Username for the new account.'
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='Email address for the new account.'
        )

    def handle(self, *args, **options):
        from users.models import User

        self.stdout.write(self.style.SUCCESS('\n╔══════════════════════════════════════════╗'))
        self.stdout.write(self.style.SUCCESS('║   CyberGuardian — Create SOC Admin       ║'))
        self.stdout.write(self.style.SUCCESS('╚══════════════════════════════════════════╝\n'))

        # --- Username ---
        username = options.get('username')
        if not username:
            username = input('Username: ').strip()
        if not username:
            raise CommandError('Username cannot be empty.')

        if User.objects.filter(username=username).exists():
            existing = User.objects.get(username=username)
            if existing.role in ['ADMIN', 'SOC_ANALYST', 'SUPER_ADMIN']:
                self.stdout.write(self.style.WARNING(
                    f'\n[!] User "{username}" already exists with role {existing.role}. No changes made.\n'
                ))
                return
            # Offer to upgrade existing user
            upgrade = input(f'\n[!] User "{username}" exists with role {existing.role}. Upgrade to SOC role? [y/N]: ').strip().lower()
            if upgrade != 'y':
                self.stdout.write(self.style.WARNING('Aborted.\n'))
                return
            role = options.get('role')
            if not role:
                role_input = input('Assign role [ADMIN / SOC_ANALYST] (default: ADMIN): ').strip().upper()
                role = role_input if role_input in ['ADMIN', 'SOC_ANALYST'] else 'ADMIN'
            existing.role = role
            existing.status = 'ACTIVE'
            existing.is_active = True
            existing.is_staff = True
            existing.save()
            self.stdout.write(self.style.SUCCESS(f'\n[✓] User "{username}" upgraded to {role} successfully.\n'))
            return

        # --- Email ---
        email = options.get('email')
        if not email:
            email = input('Email address: ').strip()
        if not email or '@' not in email:
            raise CommandError('A valid email address is required.')

        if User.objects.filter(email=email).exists():
            raise CommandError(f'An account with email "{email}" already exists.')

        # --- Role ---
        role = options.get('role')
        if not role:
            role_input = input('Assign role [ADMIN / SOC_ANALYST] (default: ADMIN): ').strip().upper()
            role = role_input if role_input in ['ADMIN', 'SOC_ANALYST'] else 'ADMIN'

        # --- Password (secure hidden input) ---
        while True:
            password = getpass.getpass('Password (hidden): ')
            if not password:
                self.stdout.write(self.style.ERROR('Password cannot be empty.'))
                continue
            confirm = getpass.getpass('Confirm Password: ')
            if password != confirm:
                self.stdout.write(self.style.ERROR('Passwords do not match. Try again.'))
                continue
            # Validate password strength
            try:
                validate_password(password)
            except ValidationError as e:
                for msg in e.messages:
                    self.stdout.write(self.style.ERROR(f'  ✗ {msg}'))
                retry = input('Use this password anyway? [y/N]: ').strip().lower()
                if retry != 'y':
                    continue
            break

        # --- Create the account ---
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            status='ACTIVE',
            is_active=True,
            is_email_verified=True,
            is_staff=True,
            is_superuser=(role == 'ADMIN'),
        )

        self.stdout.write(self.style.SUCCESS('\n╔══════════════════════════════════════════╗'))
        self.stdout.write(self.style.SUCCESS(f'║  [✓] SOC Account Created Successfully    ║'))
        self.stdout.write(self.style.SUCCESS('╚══════════════════════════════════════════╝'))
        self.stdout.write(self.style.SUCCESS(f'  Username : {username}'))
        self.stdout.write(self.style.SUCCESS(f'  Email    : {email}'))
        self.stdout.write(self.style.SUCCESS(f'  Role     : {role}'))
        self.stdout.write(self.style.SUCCESS(f'  Status   : ACTIVE'))
        self.stdout.write(self.style.SUCCESS(f'\n  Login at: /admin/login\n'))
