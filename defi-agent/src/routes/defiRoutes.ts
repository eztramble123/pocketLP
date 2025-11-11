import { Router, Request, Response } from 'express';
import { PocketLPDeFiAgent } from '../agent/solanaAgent.js';
import { DeFiRedisClient } from '../services/redisClient.js';

interface ChatRequest {
  query: string;
  userId?: string;
}

interface ManualDepositRequest {
  userId: string;
  amount: number;
  poolId?: string;
}

export function createDeFiRoutes(
  defiAgent: PocketLPDeFiAgent,
  redis: DeFiRedisClient
): Router {
  const router = Router();

  // Chat with the DeFi agent
  router.post('/chat', async (req: Request<{}, {}, ChatRequest>, res: Response) => {
    try {
      const { query, userId } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const response = await defiAgent.chatQuery(query);

      res.json({
        query,
        response,
        timestamp: new Date().toISOString(),
        agentId: 'defi-agent'
      });
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.status(500).json({ error: 'Failed to process chat query' });
    }
  });

  // Get user's DeFi balance and positions
  router.get('/balance/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const balance = await defiAgent.getUserBalance(userId);
      const positions = await redis.getUserPositions(userId);
      const transactions = await redis.getUserTransactions(userId, 5);

      res.json({
        balance,
        positions,
        recentTransactions: transactions,
        walletAddress: defiAgent.getWalletAddress()
      });
    } catch (error) {
      console.error('Error fetching user balance:', error);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

  // Manual deposit trigger (for testing)
  router.post('/deposit', async (req: Request<{}, {}, ManualDepositRequest>, res: Response) => {
    try {
      const { userId, amount, poolId } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ 
          error: 'userId and amount are required' 
        });
      }

      const operation = {
        operationId: `manual_${Date.now()}`,
        userId,
        type: 'DEPOSIT' as const,
        amount,
        token: 'USDC',
        lpPool: poolId
      };

      const txId = await defiAgent.processRoundUpDeposit(operation);

      // Log the transaction
      await redis.logTransaction(userId, {
        operationId: operation.operationId,
        type: operation.type,
        amount,
        txId,
        status: 'completed'
      });

      res.json({
        success: true,
        txId,
        operation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing manual deposit:', error);
      res.status(500).json({ error: 'Failed to process deposit' });
    }
  });

  // Get available yield pools
  router.get('/pools', async (req: Request, res: Response) => {
    try {
      // Mock pool data - in production, this would query live protocols
      const pools = [
        {
          poolId: 'jupiter_usdc_sol_001',
          poolName: 'Jupiter USDC-SOL LP',
          protocol: 'Jupiter',
          apy: 8.5,
          tvl: 1250000,
          risk: 'Medium',
          tokens: ['USDC', 'SOL']
        },
        {
          poolId: 'raydium_usdc_ray_001',
          poolName: 'Raydium USDC-RAY LP',
          protocol: 'Raydium',
          apy: 12.3,
          tvl: 890000,
          risk: 'High',
          tokens: ['USDC', 'RAY']
        },
        {
          poolId: 'orca_usdc_orca_001',
          poolName: 'Orca USDC-ORCA LP',
          protocol: 'Orca',
          apy: 9.7,
          tvl: 2100000,
          risk: 'Medium',
          tokens: ['USDC', 'ORCA']
        }
      ];

      res.json({
        pools,
        bestApy: Math.max(...pools.map(p => p.apy)),
        totalPools: pools.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching pools:', error);
      res.status(500).json({ error: 'Failed to fetch pools' });
    }
  });

  // Get agent status and wallet info
  router.get('/status', async (req: Request, res: Response) => {
    try {
      res.json({
        status: 'active',
        agentType: 'defi-agent',
        walletAddress: defiAgent.getWalletAddress(),
        network: process.env.SOLANA_NETWORK || 'devnet',
        timestamp: new Date().toISOString(),
        capabilities: [
          'round-up-deposits',
          'yield-optimization',
          'pool-monitoring',
          'chat-interface'
        ]
      });
    } catch (error) {
      console.error('Error getting agent status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  return router;
}