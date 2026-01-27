# Recruitment Platform

A full-stack recruitment management application with Next.js frontend and Django backend.

## Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Build Commands](#build-commands)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## Project Structure

```
recruit/
├── frontend/                 # Next.js 15 application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # API clients and utilities
│   │   └── utils/           # Helper functions
│   ├── public/              # Static assets
│   ├── .env.local           # Frontend environment variables
│   └── package.json
│
├── backend/                  # Django REST Framework application
│   ├── api/                 # API app with views, models, serializers
│   ├── recruitment/         # Django project settings
│   ├── .env                 # Backend environment variables
│   ├── manage.py
│   └── requirements.txt
│
└── README.md
```

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15.5.2 (App Router with Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives
- **State Management:** React Context
- **Runtime:** Node.js 18+

### Backend
- **Framework:** Django 5.0+ with Django REST Framework
- **Language:** Python 3.10+
- **Database:** SQLite (development) / PostgreSQL (production)
- **AI/ML:** Sentence Transformers, Anthropic Claude, OpenAI, Google Gemini
- **External Services:** Retell AI (voice calls)

---

## Prerequisites

### System Requirements
- **Node.js:** v18.17.0 or higher
- **Python:** v3.10 or higher
- **npm:** v9.0 or higher
- **pip:** Latest version

### Verify Installation
```bash
node --version    # Should be >= 18.17.0
npm --version     # Should be >= 9.0
python --version  # Should be >= 3.10
pip --version
```

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd recruit
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Windows (Git Bash / CMD)
source venv/Scripts/activate

# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration (see Environment Variables section)

# Run database migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Verify setup
python manage.py check

# Start development server
python manage.py runserver
```

Backend runs on: `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:3000`

### 4. Run Both Services

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/Scripts/activate  # or appropriate activation command
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Environment Variables

### Frontend (.env.local)

```env
# Claude AI Configuration
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key

# Geoapify Configuration (for location search)
NEXT_PUBLIC_GEOAPIFY_API_KEY=your_geoapify_api_key

# Retell AI Configuration
RETELL_API_KEY=your_retell_api_key

# Backend API URL (for production)
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Backend (.env)

```env
# Django Configuration
DEBUG=True                          # Set to False in production
SECRET_KEY=your-secure-secret-key   # Generate a strong key for production
DATABASE_URL=sqlite:///db.sqlite3   # Use PostgreSQL URL in production

# Allowed Hosts (comma-separated)
ALLOWED_HOSTS=localhost,127.0.0.1   # Add production domain

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_ALL_ORIGINS=False        # Set to False in production

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=your_email@gmail.com

# Retell AI Configuration
RETELL_API_KEY=your_retell_api_key
RETELL_PHONE_NUMBER=your_phone_number
RETELL_AGENT_ID=your_agent_id
RETELL_LLM_ID=your_llm_id
```

---

## Build Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |

### Backend

| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start development server |
| `python manage.py check` | Validate project configuration |
| `python manage.py check --deploy` | Run deployment checks |
| `python manage.py migrate` | Apply database migrations |
| `python manage.py makemigrations` | Create new migrations |
| `python manage.py collectstatic` | Collect static files |
| `python manage.py test` | Run test suite |

---

## Production Deployment

### Frontend Deployment

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Option B: Docker
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

#### Option C: Static Export
```bash
# Add to next.config.ts: output: 'export'
npm run build
# Deploy the 'out' folder to any static hosting (S3, Nginx, etc.)
```

### Backend Deployment

#### Option A: Docker
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "recruitment.wsgi:application", "--bind", "0.0.0.0:8000"]
```

#### Option B: Traditional Server (Nginx + Gunicorn)

1. **Install dependencies:**
```bash
pip install gunicorn psycopg2-binary
```

2. **Create systemd service:**
```ini
# /etc/systemd/system/recruitment.service
[Unit]
Description=Recruitment Django Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/recruitment/backend
Environment="PATH=/var/www/recruitment/backend/venv/bin"
ExecStart=/var/www/recruitment/backend/venv/bin/gunicorn recruitment.wsgi:application --bind 127.0.0.1:8000 --workers 3

[Install]
WantedBy=multi-user.target
```

3. **Nginx configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /var/www/recruitment/backend/staticfiles/;
    }
}
```

### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    depends_on:
      - db
    volumes:
      - static_volume:/app/staticfiles

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file:
      - ./frontend/.env.local
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: recruitment
      POSTGRES_USER: recruitment_user
      POSTGRES_PASSWORD: secure_password

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - static_volume:/var/www/static:ro
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  static_volume:
```

### Production Checklist

#### Backend
- [ ] Set `DEBUG=False`
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure PostgreSQL database
- [ ] Set proper `ALLOWED_HOSTS`
- [ ] Configure `CORS_ALLOWED_ORIGINS` (not `CORS_ALLOW_ALL_ORIGINS`)
- [ ] Run `python manage.py check --deploy`
- [ ] Run `python manage.py collectstatic`
- [ ] Set up HTTPS/SSL
- [ ] Configure proper logging

#### Frontend
- [ ] Set production API URL in environment
- [ ] Run `npm run build` successfully
- [ ] Test production build with `npm run start`
- [ ] Configure CDN for static assets (optional)
- [ ] Set up HTTPS/SSL

---

## API Documentation

### Base URL
- Development: `http://localhost:8000/api/`
- Production: `https://api.yourdomain.com/api/`

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/jobs/` | GET, POST | List/Create jobs |
| `/api/jobs/{id}/` | GET, PATCH, DELETE | Job details |
| `/api/candidates/` | GET, POST | List/Create candidates |
| `/api/candidates/{id}/` | GET, PATCH, DELETE | Candidate details |
| `/api/departments/` | GET, POST | List/Create departments |
| `/api/feedback-templates/` | GET, POST | Feedback forms |
| `/api/form-responses/` | GET, POST | Form responses |

### Authentication
Currently using session-based authentication. API endpoints are accessible without authentication in development.

---

## Troubleshooting

### Common Issues

#### 1. OneDrive Sync Issues (Windows)
If you see `EINVAL: invalid argument, readlink` errors:
```bash
# Remove the .next build cache
rm -rf frontend/.next
npm run build
```

#### 2. Multiple Lockfile Warning
If you see "detected multiple lockfiles" warning:
```bash
# Remove the parent package-lock.json if not needed
rm recruit/package-lock.json
```

#### 3. Backend Connection Refused
Ensure the backend is running before starting the frontend:
```bash
# Check if backend is running
curl http://localhost:8000/api/
```

#### 4. CORS Errors
Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL in backend `.env`.

#### 5. Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Health Checks

**Backend:**
```bash
cd backend
python manage.py check
python manage.py check --deploy  # For production readiness
```

**Frontend:**
```bash
cd frontend
npm run build  # Should complete without errors
```

---

## Support

For issues and questions:
- Create an issue in the repository
- Contact the development team

---

## License

Proprietary - CloudBerry360 Technologies Pvt Ltd
