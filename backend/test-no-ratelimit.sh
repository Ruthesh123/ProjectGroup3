#!/bin/bash

echo "Starting test with rate limiting disabled..."

# Kill existing emulators
pkill -f firebase 2>/dev/null
pkill -f java 2>/dev/null
sleep 2

# Build functions
echo "Building functions..."
cd functions
npm run build
cd ..

# Start emulators with rate limiting disabled
echo "Starting emulators with DISABLE_RATE_LIMIT=true..."
DISABLE_RATE_LIMIT=true NODE_ENV=test firebase emulators:start --project demo-internlink &
EMU_PID=$!

# Wait for emulators to start
echo "Waiting for emulators..."
sleep 15

# Run tests
echo "Running API tests..."
node test-api.js


sleep 300
sleep 300
# Kill emulators
kill $EMU_PID 2>/dev/null
pkill -f firebase 2>/dev/null
pkill -f java 2>/dev/null

echo "Test completed!"
