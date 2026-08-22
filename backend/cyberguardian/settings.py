"""
Django settings for cyberguardian project.
"""
from pathlib import Path
import os
import sys

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file if present (checks backend/ first, then project root)
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env') or load_dotenv(BASE_DIR.parent / '.env')
except ImportError:
    pass  # python-dotenv not installed; use system environment variables

SECRET_KEY = 'django-insecure-dummy-key-for-cyberguardian'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',

    # Local apps
    'users',
    'core_engine',
    'scanner',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'cyberguardian.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'cyberguardian.wsgi.application'

DB_ENGINE = os.environ.get('DB_ENGINE', 'django.db.backends.mysql')

if DB_ENGINE == 'django.db.backends.sqlite3' or os.environ.get('USE_SQLITE', 'False') == 'True' or 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('DB_NAME', 'CyberDB'),
            'USER': os.environ.get('DB_USER', 'root'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '3306'),
            'OPTIONS': {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                'charset': 'utf8mb4',
            },
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

CORS_ALLOW_ALL_ORIGINS = True

# Phase 4 — Secure File Analysis Configuration
MAX_FILE_ANALYSIS_SIZE = int(os.environ.get('MAX_FILE_ANALYSIS_SIZE', 25 * 1024 * 1024))  # Default: 25 MB
SECURE_UPLOADS_DIR = BASE_DIR / 'media' / 'secure_uploads'
os.makedirs(SECURE_UPLOADS_DIR, exist_ok=True)




# SMTP Configuration
# Falls back to console backend if credentials are not configured,
# so the dev server never crashes due to missing email setup.
_email_user = os.environ.get('EMAIL_HOST_USER', '')
_email_pass = os.environ.get('EMAIL_HOST_PASSWORD', '')

if _email_user and _email_pass:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = _email_user
    EMAIL_HOST_PASSWORD = _email_pass
else:
    # OTPs will be printed to the server console during development
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    EMAIL_HOST_USER = 'noreply@cyberguardian.local'
    EMAIL_HOST_PASSWORD = ''

# SMS OTP Configuration (Twilio, Fast2SMS, or Console mock fallback)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER') or os.environ.get('TWILIO_FROM_NUMBER', '')
FAST2SMS_API_KEY = os.environ.get('FAST2SMS_API_KEY', '')
DEFAULT_COUNTRY_CODE = os.environ.get('DEFAULT_COUNTRY_CODE', '+91')

# Django REST Framework — JWT auth as default
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# SimpleJWT token configuration
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Phase 9 — Autonomous AI Security Agent Settings
OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:7b')
AGENT_TIMEOUT = int(os.environ.get('AGENT_TIMEOUT', 45))
AGENT_MAX_STEPS = int(os.environ.get('AGENT_MAX_STEPS', 5))
AGENT_ENABLED = os.environ.get('AGENT_ENABLED', 'True').lower() in ('true', '1', 'yes', 'on')
MAX_CONCURRENT_AGENT_SESSIONS = int(os.environ.get('MAX_CONCURRENT_AGENT_SESSIONS', 3))

