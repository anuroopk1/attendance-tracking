#!/usr/bin/env bash

# Automatically kill all spawned background processes when this script exits
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "=================================================="
echo " Starting AttendTrack Local Development Servers... "
echo "=================================================="

# 1. Start Backend Node.js Server in the background
echo "-> Starting Backend API (http://localhost:3000)..."
cd backend
npm start &
cd ..

# Short delay to let the database connect and backend server bind to port 3000
sleep 1.5

# 2. Start Frontend Python Server in the foreground
echo "-> Starting Frontend Web Client (http://localhost:8080)..."
cd frontend/www
python3 -m http.server 8080
