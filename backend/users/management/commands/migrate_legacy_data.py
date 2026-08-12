from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from scanner.models import ScanResult, Report, ThreatIntelResult, Incident

User = get_user_model()

class Command(BaseCommand):
    help = 'Safely maps existing unassigned records to system/legacy user without data loss or random assignment.'

    def handle(self, *args, **options):
        self.stdout.write("Inspecting unassigned records for ownership migration...")
        
        # 1. Get or create system_legacy user
        legacy_user, created = User.objects.get_or_create(
            username='system_legacy',
            defaults={
                'email': 'system_legacy@cyberguardian.local',
                'role': 'USER',
                'status': 'INACTIVE',
                'is_active': False
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created 'system_legacy' account for legacy system records."))

        # 2. Check ScanResult records with null user
        unassigned_scans = ScanResult.objects.filter(user__isnull=True)
        count = unassigned_scans.count()
        if count > 0:
            unassigned_scans.update(user=legacy_user)
            self.stdout.write(self.style.SUCCESS(f"Associated {count} legacy scan records with 'system_legacy' user."))
        else:
            self.stdout.write("No unassigned scan records found.")

        self.stdout.write(self.style.SUCCESS("Legacy record ownership migration completed successfully!"))
