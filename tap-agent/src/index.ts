import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { TAPSigner } from './crypto/tapSigner.js';
import { RoundUpEngine } from './services/roundupEngine.js';
import { RedisClient } from './services/redis.js';
import { createTAPRoutes } from './routes/tapRoutes.js';
import { VisaAuth } from './visa/visaAuth.js';
import { VisaClient } from './visa/visaClient.js';
import { VisaKeyRegistry } from './visa/visaKeyRegistry.js';
import { createVisaRoutes } from './routes/visaRoutes.js';
import { createWellKnownRoutes } from './routes/wellKnown.js';

dotenv.config();

const app = express();
const PORT = process.env.TAP_AGENT_PORT || 4001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize services
const redis = new RedisClient(process.env.REDIS_URL);
const tapSigner = new TAPSigner(
  process.env.TAP_PRIVATE_KEY,
  process.env.TAP_KEY_ID
);
const roundupEngine = new RoundUpEngine(redis);

// Initialize Visa integration
const visaAuth = new VisaAuth(
  process.env.VISA_API_KEY,
  process.env.VISA_SHARED_SECRET
);
const visaClient = new VisaClient({
  apiKey: process.env.VISA_API_KEY,
  sharedSecret: process.env.VISA_SHARED_SECRET,
  sandbox: process.env.VISA_SANDBOX !== 'false'
});
const keyRegistry = new VisaKeyRegistry(tapSigner, visaClient);

// Routes
app.use('/api/tap', createTAPRoutes(tapSigner, roundupEngine, redis));
app.use('/api/visa', createVisaRoutes(keyRegistry, visaAuth));
app.use('', createWellKnownRoutes(keyRegistry)); // Well-known routes at root

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'tap-agent',
    keyId: tapSigner.getKeyId(),
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
    
    // Initialize Visa integration
    if (visaAuth.isConfigured()) {
      console.log('🏦 Visa credentials configured');
      console.log(`🔐 Visa API Key: ${visaAuth.getMaskedApiKey()}`);
      
      // Check registration status
      try {
        const status = await keyRegistry.checkRegistrationStatus();
        if (status.registered) {
          console.log(`✅ Already registered with Visa - Agent ID: ${status.agentId}`);
        } else {
          console.log('⚠️  Not registered with Visa yet. Use POST /api/visa/register to register');
        }
      } catch (error) {
        console.log('⚠️  Could not check Visa registration status');
      }
    } else {
      console.log('⚠️  Visa credentials not configured. Set VISA_API_KEY and VISA_SHARED_SECRET');
    }
    
    app.listen(PORT, () => {
      console.log(`🤖 TAP Agent running on port ${PORT}`);
      console.log(`📋 Key ID: ${tapSigner.getKeyId()}`);
      console.log(`🔑 Public Key: ${tapSigner.getPublicKey()}`);
      console.log(`🔍 JWKS Discovery: http://localhost:${PORT}/.well-known/jwks`);
      console.log(`🏦 Visa Integration: http://localhost:${PORT}/api/visa/status`);
    });
  } catch (error) {
    console.error('Failed to start TAP agent:', error);
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