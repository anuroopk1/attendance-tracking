#!/bin/bash

echo "=================================================="
echo " Running AttendTrack Backend verification checks..."
echo "=================================================="

# 1. Healthcheck
echo -n "1. Checking server health: "
health_res=$(curl -s http://localhost:3000/health)
if [[ $health_res == *"status\":\"ok"* ]]; then
  echo "PASS"
else
  echo "FAIL (Result: $health_res)"
  exit 1
fi

# 2. Admin Login
echo -n "2. Testing admin login: "
login_res=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}' \
  http://localhost:3000/api/auth/login)

if [[ $login_res == *"token"* ]]; then
  echo "PASS"
  # Extract token using simple sed or grep match since we don't assume jq is installed
  admin_token=$(echo "$login_res" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
else
  echo "FAIL (Result: $login_res)"
  exit 1
fi

# 3. Trainer Login
echo -n "3. Testing trainer login: "
trainer_res=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"trainer@demo.com","password":"trainer123"}' \
  http://localhost:3000/api/auth/login)

if [[ $trainer_res == *"token"* ]]; then
  echo "PASS"
  trainer_token=$(echo "$trainer_res" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
else
  echo "FAIL (Result: $trainer_res)"
  exit 1
fi

# 4. Fetch Batches as Admin
echo -n "4. Testing fetch batches as Admin: "
batches_res=$(curl -s -H "Authorization: Bearer $admin_token" http://localhost:3000/api/batches)
if [[ $batches_res == *"CS-A Morning"* ]]; then
  echo "PASS"
else
  echo "FAIL (Result: $batches_res)"
  exit 1
fi

# 5. Fetch Daily Analytics Status
echo -n "5. Testing daily status analytics API: "
analytics_res=$(curl -s -H "Authorization: Bearer $admin_token" http://localhost:3000/api/analytics/daily-status)
if [[ $analytics_res == *"totalBatches"* ]]; then
  echo "PASS"
else
  echo "FAIL (Result: $analytics_res)"
  exit 1
fi

# 6. Fetch Student Analytics
echo -n "6. Testing student analytics (Arjun Mehta): "
student_stats_res=$(curl -s -H "Authorization: Bearer $admin_token" http://localhost:3000/api/analytics/student/b1s001)
if [[ $student_stats_res == *"percentage"* ]]; then
  echo "PASS"
else
  echo "FAIL (Result: $student_stats_res)"
  exit 1
fi

# 7. Fetch Batch 30-Day Trend
echo -n "7. Testing batch trend analytics API: "
trend_res=$(curl -s -H "Authorization: Bearer $admin_token" http://localhost:3000/api/analytics/trend/b1)
if [[ $trend_res == *"percentage"* ]]; then
  echo "PASS"
else
  echo "FAIL (Result: $trend_res)"
  exit 1
fi

echo "=================================================="
echo " All verification checks PASSED successfully!    "
echo "=================================================="
