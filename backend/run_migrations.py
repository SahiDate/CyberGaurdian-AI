import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cyberguardian.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.core.management import call_command

print("Running makemigrations...")
call_command('makemigrations', 'users')
call_command('makemigrations', 'scanner')

print("Running migrate...")
call_command('migrate')

print("Migrations complete successfully!")
