import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AICore } from './core/AICore.js';
import { RedisAIMemory } from './memory/RedisAIMemory.js';
import { Logger } from './utils/Logger.js';

dotenv.config();

const app = express();
const PORT = process.env.AI_CORE_PORT || 4003;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize AI Core services
const logger = new Logger('AI-Core');
const memory = new RedisAIMemory(process.env.REDIS_URL, logger);
const aiCore = new AICore(memory, logger);

// AI Core API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-core',
    initialized: aiCore.getIsInitialized(),
    timestamp: new Date().toISOString()
  });
});

// Prediction endpoints
app.post('/api/ai/predict/yield', async (req, res) => {
  try {
    const { marketData, userProfile } = req.body;
    const prediction = await aiCore.predictYield(marketData, userProfile);
    res.json({ success: true, prediction });
  } catch (error) {
    logger.error('Yield prediction error:', error);
    res.status(500).json({ error: 'Failed to predict yield' });
  }
});

app.post('/api/ai/assess/risk', async (req, res) => {
  try {
    const { operation, userProfile, marketData } = req.body;
    const assessment = await aiCore.assessRisk(operation, userProfile, marketData);
    res.json({ success: true, assessment });
  } catch (error) {
    logger.error('Risk assessment error:', error);
    res.status(500).json({ error: 'Failed to assess risk' });
  }
});

app.post('/api/ai/analyze/sentiment', async (req, res) => {
  try {
    const { marketNews, socialData } = req.body;
    const sentiment = await aiCore.analyzeMarketSentiment(marketNews, socialData);
    res.json({ success: true, sentiment });
  } catch (error) {
    logger.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

app.post('/api/ai/analyze/spending', async (req, res) => {
  try {
    const { userId, transactions } = req.body;
    const analysis = await aiCore.analyzeSpendingPatterns(userId, transactions);
    res.json({ success: true, analysis });
  } catch (error) {
    logger.error('Spending analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze spending patterns' });
  }
});

app.post('/api/ai/decision', async (req, res) => {
  try {
    const context = req.body;
    const decision = await aiCore.makeAgentDecision(context);
    res.json({ success: true, decision });
  } catch (error) {
    logger.error('Decision making error:', error);
    res.status(500).json({ error: 'Failed to make decision' });
  }
});

app.post('/api/ai/strategy', async (req, res) => {
  try {
    const { userProfile, marketData } = req.body;
    const strategy = await aiCore.generatePersonalizedStrategy(userProfile, marketData);
    res.json({ success: true, strategy });
  } catch (error) {
    logger.error('Strategy generation error:', error);
    res.status(500).json({ error: 'Failed to generate strategy' });
  }
});

// Memory management endpoints
app.post('/api/ai/memory/conversation', async (req, res) => {
  try {
    const { userId, agentId, message } = req.body;
    await memory.storeConversation(userId, agentId, message);
    res.json({ success: true });
  } catch (error) {
    logger.error('Memory storage error:', error);
    res.status(500).json({ error: 'Failed to store conversation' });
  }
});

app.get('/api/ai/memory/conversation/:userId/:agentId', async (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await memory.getConversationHistory(userId, agentId, limit);
    res.json({ success: true, history });
  } catch (error) {
    logger.error('Memory retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

app.post('/api/ai/memory/profile', async (req, res) => {
  try {
    const profile = req.body;
    await memory.storeUserProfile(profile);
    res.json({ success: true });
  } catch (error) {
    logger.error('Profile storage error:', error);
    res.status(500).json({ error: 'Failed to store user profile' });
  }
});

app.get('/api/ai/memory/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await memory.getUserProfile(userId);
    res.json({ success: true, profile });
  } catch (error) {
    logger.error('Profile retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

async function startServer() {
  try {
    // Connect to Redis
    await memory.connect();
    
    // Initialize AI Core
    await aiCore.initialize();
    
    app.listen(PORT, () => {
      logger.info(`🤖 AI Core running on port ${PORT}`);
      logger.info('🧠 Advanced ML models initialized');
      logger.info('💾 Redis AI Memory connected');
      logger.info('🔮 Predictive analytics ready');
    });
  } catch (error) {
    logger.error('Failed to start AI Core:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await memory.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await memory.disconnect();
  process.exit(0);
});

startServer();

export { AICore, RedisAIMemory, Logger };