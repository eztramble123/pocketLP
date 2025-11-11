import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PocketLPDeFiAgent } from './agent/simplifiedSolanaAgent.js';
// import { IntelligentDeFiAgent } from './ai/IntelligentDeFiAgent.js';
import { DeFiRedisClient } from './services/redisClient.js';
import { createDeFiRoutes } from './routes/defiRoutes.js';
import { createIntelligentRoutes } from './routes/intelligentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.DEFI_AGENT_PORT || 4002;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize services
const redis = new DeFiRedisClient(process.env.REDIS_URL);
const defiAgent = new PocketLPDeFiAgent(
  process.env.SOLANA_PRIVATE_KEY,
  process.env.SOLANA_RPC_URL
);

// Initialize intelligent agent (disabled for now)
// const intelligentAgent = new IntelligentDeFiAgent(
//   process.env.SOLANA_PRIVATE_KEY,
//   process.env.SOLANA_RPC_URL,
//   process.env.AI_CORE_URL
// );

// Routes
app.use('/api/defi', createDeFiRoutes(defiAgent, redis));
// app.use('/api/intelligent', createIntelligentRoutes(intelligentAgent));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'defi-agent',
    walletAddress: defiAgent.getWalletAddress(),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

async function startServer() {
  try {
    // Connect to Redis
    await redis.connect();
    
    // Initialize DeFi agent
    await defiAgent.initialize();
    
    // Initialize intelligent agent (disabled for now)
    // await intelligentAgent.initialize();
    
    // Subscribe to messages from TAP agent
    await redis.subscribeToTAPAgent((message) => {
      console.log(`📨 Received message from TAP agent:`, message);
      defiAgent.handleAgentMessage(message);
      // intelligentAgent.handleAgentMessage(message); // Also handle with intelligent agent
    });
    
    app.listen(PORT, () => {
      console.log(`🤖 DeFi Agent running on port ${PORT}`);
      console.log(`🌐 Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
      console.log(`📍 Wallet: ${defiAgent.getWalletAddress()}`);
      console.log(`🔗 Connected to TAP agent via Redis`);
    });
  } catch (error) {
    console.error('Failed to start DeFi agent:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await redis.disconnect();
  process.exit(0);
});

startServer();