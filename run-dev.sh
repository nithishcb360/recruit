#!/bin/bash

# Start Django backend
echo "Starting Django backend..."
cd backend
source venv/bin/activate
python manage.py runserver &
BACKEND_PID=$!

# Start Next.js frontend
echo "Starting Next.js frontend..."
cd ../frontend
pnpm dev &
FRONTEND_PID=$!

# Wait for both processes
echo "Development servers are running:"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/api/docs/"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for processes
wait