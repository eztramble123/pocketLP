#!/bin/bash

# PocketLP Demo Startup Script
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

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis not installed. Installing Redis..."
    
    # Try different package managers
    if command -v brew &> /dev/null; then
        echo "📦 Installing Redis via Homebrew..."
        brew install redis
    elif command -v port &> /dev/null; then
        echo "📦 Installing Redis via MacPorts..."
        sudo port install redis
    else
        echo "❌ No package manager found. Please install Redis manually:"
        echo "   1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        echo "   2. Then run: brew install redis"
        echo "   3. Or download from: https://redis.io/download"
        exit 1
    fi
fi

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "⚠️  Redis server not running. Starting Redis..."
    redis-server --daemonize yes --port 6379
    sleep 2
    if pgrep -x "redis-server" > /dev/null; then
        echo "✅ Redis server started"
    else
        echo "❌ Failed to start Redis automatically. Starting manually..."
        echo "🔄 Starting Redis in background..."
        nohup redis-server > /dev/null 2>&1 &
        sleep 3
        if pgrep -x "redis-server" > /dev/null; then
            echo "✅ Redis server started manually"
        else
            echo "❌ Could not start Redis. Please start manually in another terminal:"
            echo "   redis-server"
            echo ""
            echo "⏳ Waiting for Redis to start (press Enter when Redis is running)..."
            read -p ""
        fi
    fi
else
    echo "✅ Redis server is running"
fi

# Check required ports
echo "🔍 Checking ports..."
check_port 4001 || exit 1  # TAP Agent
check_port 4002 || exit 1  # DeFi Agent  
check_port 3000 || exit 1  # Frontend

echo "✅ All ports available"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it first."
    exit 1
fi

# Check for required environment variables
if ! grep -q "SOLANA_PRIVATE_KEY=36Ug5QA2a1v1wg8hsPTcsr7GvYdqizMjvSMfaS72JXm4p6oNCZ6rSfrz33D7GPTMmaN4DYrGbTueEy92vTPgsrbE" .env; then
    echo "⚠️  Warning: Solana private key not configured in .env"
fi

if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  Warning: OpenAI API key not configured in .env"
fi

echo "🏦 Demo Wallet Address: G7DMuPShVqNvMqLqFZQffYujNt6FoE8PXZFVmgoBiPcQ"
echo "💰 Fund at: https://faucet.solana.com"
echo ""

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

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if services started successfully
echo ""
echo "🔍 Checking service status..."

# Check TAP Agent
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "✅ TAP Agent: http://localhost:4001 (Healthy)"
else
    echo "❌ TAP Agent: Failed to start"
    echo "   Check logs: tail -f logs/tap-agent.log"
fi

# Check DeFi Agent
if curl -s http://localhost:4002/health > /dev/null 2>&1; then
    echo "✅ DeFi Agent: http://localhost:4002 (Healthy)"
else
    echo "❌ DeFi Agent: Failed to start"
    echo "   Check logs: tail -f logs/defi-agent.log"
fi

# Check Frontend (Next.js takes longer to start)
sleep 5
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: http://localhost:3000 (Ready)"
else
    echo "⏳ Frontend: Starting up... (check in 30 seconds)"
    echo "   Check logs: tail -f logs/frontend.log"
fi

echo ""
echo "🎯 DEMO READY!"
echo "================================"
echo "🌐 Frontend:      http://localhost:3000"
echo "🤖 TAP Agent:     http://localhost:4001"
echo "💎 DeFi Agent:    http://localhost:4002"
echo ""
echo "📊 API Endpoints:"
echo "   TAP Status:    http://localhost:4001/health"
echo "   DeFi Status:   http://localhost:4002/health"  
echo "   Visa Status:   http://localhost:4001/api/visa/status"
echo "   JWKS Discovery: http://localhost:4001/.well-known/jwks"
echo ""
echo "🎮 Demo Flow:"
echo "   1. Open http://localhost:3000"
echo "   2. Try Purchase Simulator ($15.50 → $16.00 round-up)"
echo "   3. Chat with agents about yields and strategy"
echo "   4. View dashboard with mock positions"
echo "   5. Check agent status and Visa integration"
echo ""
echo "📝 View logs with:"
echo "   tail -f logs/tap-agent.log"
echo "   tail -f logs/defi-agent.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"

# Keep script running and show live status
while true; do
    sleep 30
    
    # Quick health check every 30 seconds
    echo "⏱️  $(date +%H:%M:%S) - Services running..."
    
    # Check if processes are still alive
    if ! kill -0 $TAP_PID 2>/dev/null; then
        echo "❌ TAP Agent stopped unexpectedly"
    fi
    
    if ! kill -0 $DEFI_PID 2>/dev/null; then
        echo "❌ DeFi Agent stopped unexpectedly"  
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend stopped unexpectedly"
    fi
done