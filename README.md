# PocketLP - Twin Agent System

A round-up savings platform powered by two specialized AI agents:

1. **TAP Agent** - Handles Visa Trusted Agent Protocol signatures and round-up calculations
2. **DeFi Agent** - Manages Solana investments using Agent Kit for yield optimization

## 🏗️ Architecture

```
Frontend (Next.js) ↔ TAP Agent (Node.js) ↔ Redis ↔ DeFi Agent (Solana Agent Kit)
                         ↓                            ↓
                   Ed25519 Signing              Solana Blockchain
                   Round-up Logic               Jupiter LP Pools
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Redis Server
- OpenAI API Key
- Solana wallet for testing

### 1. Clone and Setup

```bash
git clone <your-repo>
cd pocketlp

# Copy environment file
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your keys:

```bash
# Get OpenAI API key from https://platform.openai.com/
OPENAI_API_KEY=sk-...

# Generate new Solana keypair or use existing
# For new keypair, the DeFi agent will generate one on first run

# Redis (install locally or use Docker)
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

```bash
# Option 1: Docker
docker run -d -p 6379:6379 redis:alpine

# Option 2: Local install (macOS)
brew install redis
brew services start redis

# Option 3: Linux
sudo apt install redis-server
sudo systemctl start redis-server
```

### 4. Install Dependencies

```bash
# Install all dependencies
npm install

# Or install individually
cd frontend && npm install && cd ..
cd tap-agent && npm install && cd ..
cd defi-agent && npm install && cd ..
```

### 5. Start All Services

**Terminal 1: TAP Agent**
```bash
cd tap-agent
npm run dev
```

**Terminal 2: DeFi Agent**
```bash
cd defi-agent
npm run dev
```

**Terminal 3: Frontend**
```bash
cd frontend
npm run dev
```

### 6. Open Dashboard

Visit [http://localhost:3000](http://localhost:3000)

## 🎯 How It Works

### Purchase Flow

1. **User makes purchase** in the simulator
2. **TAP Agent** signs request with Ed25519 (Visa TAP protocol)
3. **Round-up calculated** and stored in Redis
4. **At $10 threshold**, TAP agent triggers DeFi agent
5. **DeFi Agent** finds best Solana LP pool and deposits

### Agent Communication

- **Redis pub/sub** for real-time messaging between agents
- **REST APIs** for frontend integration
- **WebSockets** for live UI updates (<10s)

## 🛠️ Features

### TAP Agent
- ✅ Ed25519 signature generation (RFC 9421)
- ✅ Purchase processing and round-up calculation
- ✅ Signature verification for merchants
- ✅ Threshold-based DeFi triggering
- ✅ Transaction history storage

### DeFi Agent
- ✅ Solana Agent Kit integration
- ✅ Jupiter LP pool scanning
- ✅ Yield comparison and optimization
- ✅ Chat interface for user queries
- ✅ Real-time balance tracking

### Frontend
- ✅ Dashboard with yield analytics
- ✅ Purchase simulator
- ✅ Agent chat interface
- ✅ Real-time transaction updates
- ✅ Pool comparison charts

## 🧪 Testing

### Test Purchase Flow

1. Go to **Purchase** tab
2. Enter amount like `$23.45`
3. Click "Complete Purchase"
4. See round-up: `$0.55`
5. Repeat until $10 threshold reached
6. Watch DeFi agent process deposit

### Test Agent Chat

1. Go to **Agent Chat** tab
2. Ask: "What's the best yield?"
3. See real-time response from DeFi agent
4. Try: "What's my balance?"

## 🔐 Security

### TAP Signatures
- Ed25519 cryptographic signatures
- 8-minute expiry windows
- Nonce replay protection
- RFC 9421 compliant

### Solana Wallet
- Keypair stored securely
- Devnet for testing
- Production-ready for mainnet

## 🌐 API Endpoints

### TAP Agent (Port 4001)

```
POST /api/tap/sign        # Generate TAP signature
POST /api/tap/purchase    # Process purchase & round-up
POST /api/tap/verify      # Verify signature (merchants)
GET  /api/tap/roundups/:userId  # Get user round-ups
GET  /health              # Health check
```

### DeFi Agent (Port 4002)

```
POST /api/defi/chat       # Chat with agent
GET  /api/defi/balance/:userId  # Get user balance
POST /api/defi/deposit    # Manual deposit
GET  /api/defi/pools      # Available pools
GET  /api/defi/status     # Agent status
GET  /health              # Health check
```

## 🚧 Development

### Adding New Features

1. **TAP Agent**: Modify `tap-agent/src/`
2. **DeFi Agent**: Add to `defi-agent/src/`
3. **Frontend**: Update `frontend/components/`
4. **Shared Types**: Edit `shared/types.ts`

### Production Deployment

1. Set `SOLANA_NETWORK=mainnet`
2. Use production Solana RPC
3. Configure production Redis
4. Deploy agents to separate containers
5. Use environment secrets

## 🔄 Agent Communication

```
TAP Agent → Redis Channel → DeFi Agent
{
  "type": "ROUND_UP_TRIGGER",
  "payload": {
    "userId": "user123",
    "amount": 10.45,
    "reason": "threshold_reached"
  },
  "agentId": "tap-agent"
}
```

## 📊 Monitoring

- **Health endpoints** for uptime monitoring
- **Redis logs** for agent communication
- **Transaction history** in Redis
- **Error handling** with retry logic

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Add tests for new features
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - Build amazing agent-powered DeFi experiences!

---

**Need help?** Check the logs or open an issue with your setup details.# pocketLP
