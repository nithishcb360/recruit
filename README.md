# Full Stack Application

This project consists of a Next.js frontend and Django backend.

## Project Structure

```
recruit/
├── frontend/          # Next.js application
└── backend/           # Django application
```

## Frontend (Next.js)

The frontend is built with Next.js, TypeScript, and Tailwind CSS.

### Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Backend (Django)

The backend is built with Django and Django REST Framework.

### Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The backend will run on `http://localhost:8000`

### API Endpoints
- `GET /api/` - API root endpoint

## Development

1. Start the Django backend:
```bash
cd backend
source venv/Scripts/activate
python manage.py runserver
```

2. Start the Next.js frontend:
```bash
cd frontend
npm run dev
```

Both services should be running simultaneously for full functionality.