#!/bin/bash

# PocketLP Demo Startup Script (Redis Already Running)
echo "🚀 Starting PocketLP Demo..."
echo "================================"

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
    exit
}

# Set up trap for cleanup on exit
trap cleanup SIGINT SIGTERM

# Check if Redis is running
if lsof -Pi :6379 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Redis server is running on port 6379"
else
    echo "❌ Redis not running. Please start Redis first:"
    echo "   docker run -p 6379:6379 redis:7-alpine"
    exit 1
fi

# Check required ports (skip Redis port since it's in use)
echo "🔍 Checking application ports..."
if lsof -Pi :4001 -sTCP:LISTEN -t >/dev/null && [ "$(lsof -Pi :4001 -sTCP:LISTEN -t | wc -l)" -gt 0 ]; then
    echo "⚠️  Port 4001 (TAP Agent) is already in use. Skipping..."
else
    echo "✅ Port 4001 available for TAP Agent"
fi

if lsof -Pi :4002 -sTCP:LISTEN -t >/dev/null && [ "$(lsof -Pi :4002 -sTCP:LISTEN -t | wc -l)" -gt 0 ]; then
    echo "⚠️  Port 4002 (DeFi Agent) is already in use. Skipping..."
else
    echo "✅ Port 4002 available for DeFi Agent"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null && [ "$(lsof -Pi :3000 -sTCP:LISTEN -t | wc -l)" -gt 0 ]; then
    echo "⚠️  Port 3000 (Frontend) is already in use. Skipping..."
else
    echo "✅ Port 3000 available for Frontend"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

echo ""
echo "🏦 Demo Wallet Address: G7DMuPShVqNvMqLqFZQffYujNt6FoE8PXZFVmgoBiPcQ"
echo "💰 Fund at: https://faucet.solana.com"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start TAP Agent
echo "🤖 Starting TAP Agent (Port 4001)..."
cd tap-agent
if [ -f "package.json" ]; then
    npm run dev > ../logs/tap-agent.log 2>&1 &
    TAP_PID=$!
    echo "   Process ID: $TAP_PID"
    echo "   Logs: tail -f logs/tap-agent.log"
else
    echo "❌ tap-agent/package.json not found"
fi
cd ..
sleep 3

# Start DeFi Agent  
echo "💎 Starting DeFi Agent (Port 4002)..."
cd defi-agent
if [ -f "package.json" ]; then
    npm run dev > ../logs/defi-agent.log 2>&1 &
    DEFI_PID=$!
    echo "   Process ID: $DEFI_PID"
    echo "   Logs: tail -f logs/defi-agent.log"
else
    echo "❌ defi-agent/package.json not found"
fi
cd ..
sleep 3

# Start Frontend
echo "🌐 Starting Frontend (Port 3000)..."
cd frontend
if [ -f "package.json" ]; then
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   Process ID: $FRONTEND_PID"
    echo "   Logs: tail -f logs/frontend.log"
else
    echo "❌ frontend/package.json not found"
fi
cd ..

echo ""
echo "⏳ Starting services... (30 seconds)"
sleep 30

# Check service status
echo ""
echo "🔍 Checking service status..."

# Check TAP Agent
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "✅ TAP Agent: http://localhost:4001 (Healthy)"
else
    echo "❌ TAP Agent: Not responding (check logs/tap-agent.log)"
fi

# Check DeFi Agent
if curl -s http://localhost:4002/health > /dev/null 2>&1; then
    echo "✅ DeFi Agent: http://localhost:4002 (Healthy)"
else
    echo "❌ DeFi Agent: Not responding (check logs/defi-agent.log)"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: http://localhost:3000 (Ready)"
else
    echo "⏳ Frontend: Still starting... (check logs/frontend.log)"
fi

echo ""
echo "🎯 DEMO READY!"
echo "================================"
echo "🌐 Frontend:      http://localhost:3000"
echo "🤖 TAP Agent:     http://localhost:4001"
echo "💎 DeFi Agent:    http://localhost:4002"
echo ""
echo "📊 API Endpoints:"
echo "   TAP Status:     http://localhost:4001/health"
echo "   DeFi Status:    http://localhost:4002/health"
echo "   Visa Status:    http://localhost:4001/api/visa/status"
echo "   JWKS Discovery: http://localhost:4001/.well-known/jwks"
echo ""
echo "🎮 Demo Flow:"
echo "   1. Open http://localhost:3000"
echo "   2. Try Purchase Simulator ($15.50 → $16.00 round-up)"
echo "   3. Chat with agents about yields and strategy"
echo "   4. View dashboard with mock positions"
echo "   5. Check agent status and Visa integration"
echo ""
echo "📝 View real-time logs:"
echo "   tail -f logs/tap-agent.log"
echo "   tail -f logs/defi-agent.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

# Keep script running and show live status
while true; do
    sleep 60
    echo "⏱️  $(date +%H:%M:%S) - Services running (PIDs: TAP=$TAP_PID, DeFi=$DEFI_PID, Frontend=$FRONTEND_PID)"
done