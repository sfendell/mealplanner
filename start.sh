#!/bin/bash

echo "Starting MealPrep application..."

# Start backend server in background
echo "Starting backend server on port 5001..."
NODE_ENV=development npm run server &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend server in background
echo "Starting frontend server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo "Both servers are starting..."
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait 