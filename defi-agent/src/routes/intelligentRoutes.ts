import express from 'express';
import { IntelligentDeFiAgent } from '../ai/IntelligentDeFiAgent.js';

export function createIntelligentRoutes(intelligentAgent: IntelligentDeFiAgent) {
  const router = express.Router();

  // Intelligent yield prediction
  router.post('/predict/yield', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      
      if (!userId || !amount) {
        return res.status(400).json({ error: 'userId and amount are required' });
      }
      
      const prediction = await intelligentAgent.predictOptimalYield(userId, amount);
      
      res.json({
        success: true,
        prediction,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Yield prediction error:', error);
      res.status(500).json({
        error: 'Failed to predict yield',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Intelligent risk assessment
  router.post('/assess/risk', async (req, res) => {
    try {
      const { operation, userId } = req.body;
      
      if (!operation || !userId) {
        return res.status(400).json({ error: 'operation and userId are required' });
      }
      
      const assessment = await intelligentAgent.assessInvestmentRisk(operation, userId);
      
      res.json({
        success: true,
        assessment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Risk assessment error:', error);
      res.status(500).json({
        error: 'Failed to assess risk',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Market sentiment analysis
  router.get('/sentiment', async (req, res) => {
    try {
      const sentiment = await intelligentAgent.analyzeMarketSentiment();
      
      res.json({
        success: true,
        sentiment,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze sentiment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Personalized investment strategy
  router.post('/strategy', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const strategy = await intelligentAgent.generatePersonalizedStrategy(userId);
      
      res.json({
        success: true,
        strategy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Strategy generation error:', error);
      res.status(500).json({
        error: 'Failed to generate strategy',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Intelligent chat interface
  router.post('/chat', async (req, res) => {
    try {
      const { userId, query } = req.body;
      
      if (!userId || !query) {
        return res.status(400).json({ error: 'userId and query are required' });
      }
      
      const response = await intelligentAgent.intelligentChatQuery(userId, query);
      
      res.json({
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({
        error: 'Failed to process chat query',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Proactive insights
  router.get('/insights/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const insights = await intelligentAgent.generateProactiveInsights(userId);
      
      res.json({
        success: true,
        insights,
        count: insights.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Insights generation error:', error);
      res.status(500).json({
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Intelligent round-up processing
  router.post('/roundup/process', async (req, res) => {
    try {
      const { operation } = req.body;
      
      if (!operation) {
        return res.status(400).json({ error: 'operation is required' });
      }
      
      const txId = await intelligentAgent.processIntelligentRoundUpDeposit(operation);
      
      res.json({
        success: true,
        transactionId: txId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Intelligent round-up processing error:', error);
      res.status(500).json({
        error: 'Failed to process round-up deposit',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Wallet information
  router.get('/wallet', (req, res) => {
    try {
      res.json({
        success: true,
        walletAddress: intelligentAgent.getWalletAddress(),
        tools: intelligentAgent.getTools().length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Wallet info error:', error);
      res.status(500).json({
        error: 'Failed to get wallet info',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}