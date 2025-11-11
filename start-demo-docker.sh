#!/bin/bash

# PocketLP Demo Startup Script (Docker Redis Version)
echo "🚀 Starting PocketLP Demo with Docker Redis..."
echo "============================================="

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Function to kill processes on cleanup
cleanup() {
    echo "🛑 Shutting down services..."
    kill $TAP_PID $DEFI_PID $FRONTEND_PID 2>/dev/null
    docker stop pocketlp-redis 2>/dev/null
    exit
}

# Set up trap for cleanup on exit
trap cleanup SIGINT SIGTERM

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop or use native Redis:"
    echo "   Download: https://docker.com/products/docker-desktop"
    echo "   Or run: ./start-demo.sh (for native Redis)"
    exit 1
fi

# Start Redis in Docker
echo "🐳 Starting Redis in Docker..."
docker run -d --name pocketlp-redis -p 6379:6379 redis:7-alpine > /dev/null 2>&1

# Remove existing container if it exists
if [ $? -ne 0 ]; then
    echo "🔄 Removing existing Redis container..."
    docker rm -f pocketlp-redis > /dev/null 2>&1
    echo "🐳 Starting fresh Redis container..."
    docker run -d --name pocketlp-redis -p 6379:6379 redis:7-alpine
fi

sleep 3

# Test Redis connection
if docker exec pocketlp-redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis container running and responsive"
else
    echo "❌ Redis container failed to start"
    exit 1
fi

# Check required ports
echo "🔍 Checking ports..."
check_port 4001 || exit 1  # TAP Agent
check_port 4002 || exit 1  # DeFi Agent  
check_port 3000 || exit 1  # Frontend

echo "✅ All ports available"

# Rest of the script remains the same...
# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

echo "🏦 Demo Wallet Address: G7DMuPShVqNvMqLqFZQffYujNt6FoE8PXZFVmgoBiPcQ"
echo "💰 Fund at: https://faucet.solana.com"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start TAP Agent
echo "🤖 Starting TAP Agent (Port 4001)..."
cd tap-agent
npm run dev > ../logs/tap-agent.log 2>&1 &
TAP_PID=$!
cd ..
sleep 3

# Start DeFi Agent  
echo "💎 Starting DeFi Agent (Port 4002)..."
cd defi-agent
npm run dev > ../logs/defi-agent.log 2>&1 &
DEFI_PID=$!
cd ..
sleep 3

# Start Frontend
echo "🌐 Starting Frontend (Port 3000)..."
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 3

echo ""
echo "🎯 DEMO READY!"
echo "================================"
echo "🌐 Frontend:      http://localhost:3000"
echo "🤖 TAP Agent:     http://localhost:4001"
echo "💎 DeFi Agent:    http://localhost:4002"
echo "🐳 Redis:         Docker container 'pocketlp-redis'"
echo ""
echo "🛑 Press Ctrl+C to stop all services and Docker Redis"

# Keep script running
while true; do
    sleep 30
    echo "⏱️  $(date +%H:%M:%S) - Services running..."
done