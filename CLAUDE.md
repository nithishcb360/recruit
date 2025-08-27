# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development (Full Stack):**
```bash
./run-dev.sh    # Start both frontend and backend servers
```

**Frontend Development:**
```bash
cd frontend
pnpm dev        # Start Next.js dev server on localhost:3000
pnpm build      # Build for production
pnpm start      # Run production build
pnpm lint       # Run Next.js linter
```

**Backend Development:**
```bash
cd backend
source venv/bin/activate
python manage.py runserver       # Start Django dev server on localhost:8000
python manage.py makemigrations  # Create database migrations
python manage.py migrate         # Apply migrations
python manage.py test            # Run tests
```

**Demo Data Management:**
```bash
cd backend
python create_test_data.py       # Create sample job/candidate data
python create_admin_test_data.py # Create admin user and org
python manage.py populate_departments     # Populate departments
python manage.py populate_feedback_templates  # Setup feedback forms
```

**API Documentation:** http://localhost:8000/api/docs/
**Django Admin:** http://localhost:8000/admin/

**Test Credentials:**
- Admin: admin@demo.com / admin123
- Recruiter: recruiter@demo.com / recruiter123
- HR Manager: hr@demo.com / hr123
- Interviewer: interviewer@demo.com / interviewer123

## Architecture

This is a full-stack recruitment SaaS platform with multi-tenant organization isolation.

### Frontend (Next.js 15.2.4, React 19, TypeScript)
- **Authentication:** JWT-based auth with context provider (`contexts/auth-context.tsx`)
- **API Client:** Singleton client with automatic token handling (`lib/api/client.ts`)
- **State Management:** React Context for auth, custom hooks for data fetching
- **UI Library:** shadcn/ui with Radix UI primitives
- **Styling:** Tailwind CSS with responsive design
- **File Upload:** Built-in support for resume/JD parsing (PDF, DOCX, TXT)

### Backend (Django 5.0.2, Django REST Framework)
- **Apps Structure:**
  - `accounts`: User/organization management, JWT auth
  - `jobs`: Job postings, departments, AI-powered JD generation
  - `candidates`: Candidate profiles, applications, stage management
  - `interviews`: Scheduling, feedback forms, templates
  - `analytics`: Metrics, reporting, source performance tracking
- **Authentication:** JWT with automatic refresh, role-based permissions
- **API Documentation:** Auto-generated with drf-spectacular
- **File Processing:** PyPDF2 and python-docx for document parsing
- **Configuration:** Environment-based settings with python-decouple

### Data Flow Patterns
- **API Requests:** All go through singleton ApiClient with automatic auth headers
- **Error Handling:** Centralized error responses with toast notifications
- **File Uploads:** Separate uploadFile method for multipart/form-data
- **State Updates:** Optimistic updates with rollback on failure

### Key Component Patterns
- **Data Safety:** All components include null/undefined checks for properties
- **Loading States:** Components show loading indicators during async operations
- **Form Validation:** Client-side validation with server-side error display
- **Toast Notifications:** Consistent success/error feedback via useToast hook

### Development Patterns
- **Type Safety:** Strict TypeScript interfaces for all API responses
- **Component Props:** Always include safety checks for required vs optional props
- **Array Operations:** Use .filter(Boolean) to remove null/undefined elements
- **String Operations:** Safe access with fallbacks (e.g., `name || 'Unknown'`)

**Path Aliases:**
- Frontend: `@/*` maps to the frontend root directory

## Important Notes

**Component Safety Requirements:**
- Always add null checks for object properties before accessing nested properties
- Use fallback values for string operations (e.g., `(obj.name || '').toLowerCase()`)
- Filter out undefined elements from arrays before rendering with `.filter(Boolean)`
- Check `Array.isArray()` before calling array methods

**File Upload Handling:**
- Supported formats: PDF, DOCX, TXT (max 5MB)
- Use the `uploadFile` method for multipart uploads, not regular `post`
- Always validate file type and size on frontend before upload

**Icon Usage:**
- Use `Monitor` instead of `Screen` from lucide-react (Screen doesn't exist)
- Always verify icon imports exist before using them