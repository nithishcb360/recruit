@echo off
echo Starting both frontend and backend servers...
echo.
echo Starting backend in new window...
start "Django Backend" cmd /k "cd backend && python manage.py runserver 8000"
echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul
echo.
echo Starting frontend in new window...
start "Next.js Frontend" cmd /k "cd frontend && npm run dev"
echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000 (or next available port)
pause