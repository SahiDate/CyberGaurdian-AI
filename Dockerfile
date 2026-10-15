# ==========================================
# Stage 1: Build React/Vite Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# VITE_API_URL is left empty so the frontend uses relative paths (same-origin)
RUN npm run build

# ==========================================
# Stage 2: Production Python Backend & Server
# ==========================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DJANGO_SETTINGS_MODULE=cyberguardian.settings

WORKDIR /app

# System dependencies for PostgreSQL and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ ./backend/

# Copy built frontend assets from builder stage into the location settings.py expects
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Collect static files for WhiteNoise
WORKDIR /app/backend
RUN DJANGO_DEBUG=False DATABASE_URL=sqlite:///tmp/collectstatic.db \
    python manage.py collectstatic --noinput || true

EXPOSE 8000

# Migrations run at startup against the real DATABASE_URL, then gunicorn serves
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn cyberguardian.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120"]
