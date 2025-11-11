import { SolanaAgentKit, createLangchainTools, KeypairWallet } from 'solana-agent-kit';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import DefiPlugin from '@solana-agent-kit/plugin-defi';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { DeFiOperation, LPPosition, UserBalance, AgentMessage } from '../../../shared/types.js';
import { IntelligenceEngine } from '../ai/intelligenceEngine.js';

export class PocketLPDeFiAgent {
  private agent: SolanaAgentKit;
  private tools: any[];
  private isInitialized: boolean = false;
  private intelligence: IntelligenceEngine;
  private conversationHistory: Map<string, Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>> = new Map();

  constructor(privateKey?: string, rpcUrl?: string) {
    // Initialize wallet
    let keyPair: Keypair;
    if (privateKey) {
      keyPair = Keypair.fromSecretKey(bs58.decode(privateKey));
    } else {
      keyPair = Keypair.generate();
      console.log('Generated new keypair. Private key:', bs58.encode(keyPair.secretKey));
    }

    const wallet = new KeypairWallet(keyPair);

    // Initialize Solana Agent Kit
    this.agent = new SolanaAgentKit(
      wallet,
      rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
      }
    )
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(MiscPlugin);

    // Create tools for LangChain integration
    this.tools = createLangchainTools(this.agent, this.agent.actions);
    
    // Initialize intelligence engine
    this.intelligence = new IntelligenceEngine(process.env.OPENAI_API_KEY || '');
  }

  public async initialize(): Promise<void> {
    try {
      // Get wallet balance to verify connection
      const balance = await this.agent.connection.getBalance(this.agent.wallet_address);
      console.log(`🎯 DeFi Agent initialized`);
      console.log(`📍 Wallet: ${this.agent.wallet_address.toString()}`);
      console.log(`💰 SOL Balance: ${balance / 1e9}`);
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize DeFi agent:', error);
      throw error;
    }
  }

  public async processRoundUpDeposit(operation: DeFiOperation): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Agent not initialized');
    }

    try {
      console.log(`💰 Processing DeFi deposit: $${operation.amount} for user ${operation.userId}`);

      // Perform risk assessment
      const riskAssessment = await this.intelligence.assessRisk(
        operation.userId,
        operation.lpPool || 'auto',
        operation.amount
      );

      if (riskAssessment.riskLevel === 'high') {
        console.warn(`⚠️ High risk detected: ${riskAssessment.warnings.join(', ')}`);
      }

      // Get AI-powered yield predictions
      const predictions = await this.intelligence.predictYieldOpportunities(operation.userId);
      const bestPool = predictions[0] || await this.findBestYieldPool(operation.amount);
      
      if (!bestPool) {
        throw new Error('No suitable pools found');
      }

      // Learn from user behavior
      await this.intelligence.learnFromUserBehavior(operation.userId, {
        type: 'deposit',
        poolId: bestPool.poolId,
        amount: operation.amount,
        outcome: 'neutral',
        timestamp: new Date()
      });

      // For demo purposes, we'll simulate converting USD to USDC
      const usdcAmount = operation.amount; // 1:1 conversion for demo

      console.log(`🚀 Depositing ${usdcAmount} USDC to ${bestPool.poolName} (APY: ${bestPool.apy || bestPool.currentApy}%)`);
      console.log(`📊 Risk Assessment: ${riskAssessment.riskLevel} (${(riskAssessment.riskScore * 100).toFixed(1)}%)`);
      
      // For now, we'll simulate the transaction
      const txId = `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store position data
      await this.updateUserPosition(operation.userId, {
        poolId: bestPool.poolId,
        poolName: bestPool.poolName || bestPool.poolId,
        amount: usdcAmount,
        apy: bestPool.apy || bestPool.currentApy || 0,
        value: usdcAmount
      });

      return txId;
    } catch (error) {
      console.error('Error processing DeFi deposit:', error);
      throw error;
    }
  }

  private async findBestYieldPool(amount: number): Promise<LPPosition | null> {
    // Simulate finding best yield pools on Jupiter/Solana
    // In production, you'd query actual protocols
    const mockPools: LPPosition[] = [
      {
        poolId: 'jupiter_usdc_sol_001',
        poolName: 'Jupiter USDC-SOL LP',
        amount: 0,
        apy: 8.5,
        value: 0
      },
      {
        poolId: 'raydium_usdc_ray_001',
        poolName: 'Raydium USDC-RAY LP',
        amount: 0,
        apy: 12.3,
        value: 0
      },
      {
        poolId: 'orca_usdc_orca_001',
        poolName: 'Orca USDC-ORCA LP',
        amount: 0,
        apy: 9.7,
        value: 0
      }
    ];

    // Sort by APY (descending) and return best option
    const sortedPools = mockPools.sort((a, b) => b.apy - a.apy);
    
    // In production, you'd also check:
    // - Pool liquidity
    // - Impermanent loss risk
    // - Pool fees
    // - Historical performance
    
    return sortedPools[0] || null;
  }

  public async getUserBalance(userId: string): Promise<UserBalance> {
    // In production, this would query actual blockchain state
    // For now, we'll simulate stored positions
    const mockBalance: UserBalance = {
      userId,
      totalRoundUps: 0,
      totalDeposited: 0,
      currentYield: 0,
      lpPositions: []
    };

    return mockBalance;
  }

  private async updateUserPosition(userId: string, position: LPPosition): Promise<void> {
    // In production, you'd store this in a database
    console.log(`📊 Updated position for user ${userId}:`, position);
  }

  public async handleAgentMessage(message: AgentMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'ROUND_UP_TRIGGER':
          const operation: DeFiOperation = {
            operationId: `op_${Date.now()}`,
            userId: message.payload.userId,
            type: 'DEPOSIT',
            amount: message.payload.amount,
            token: 'USDC'
          };
          
          const txId = await this.processRoundUpDeposit(operation);
          console.log(`✅ Processed round-up deposit: ${txId}`);
          break;
          
        default:
          console.log(`🤔 Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling agent message:', error);
    }
  }

  public async chatQuery(query: string, userId: string = 'default'): Promise<string> {
    try {
      // Get or create conversation history
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId)!;

      // Add user message to history
      history.push({
        role: 'user',
        content: query,
        timestamp: new Date()
      });

      // Use AI engine for intelligent response
      const aiResponse = await this.intelligence.processChat(userId, query, history);
      
      // Add assistant response to history
      history.push({
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      });

      // Keep only last 20 messages
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Execute any recommended actions
      if (aiResponse.actions && aiResponse.actions.length > 0) {
        for (const action of aiResponse.actions) {
          console.log(`🎯 Executing action: ${action.type}`, action.data);
        }
      }

      return aiResponse.response;
    } catch (error) {
      console.error('Error processing chat query:', error);
      
      // Fallback to simple responses if AI fails
      if (query.toLowerCase().includes('yield') || query.toLowerCase().includes('apy')) {
        const predictions = await this.intelligence.predictYieldOpportunities(userId);
        const topPools = predictions.slice(0, 3).map((p, i) => 
          `${i + 1}. ${p.poolId}: ${p.currentApy}% APY (Risk: ${(p.riskScore * 100).toFixed(0)}%)`
        ).join('\n');
        return `Current best yield opportunities:\n${topPools}`;
      }
      
      if (query.toLowerCase().includes('strategy')) {
        const strategy = await this.intelligence.generateInvestmentStrategy(userId);
        return `Your personalized investment strategy:\n${strategy.strategy}\n\nReasoning: ${strategy.reasoning.join(', ')}`;
      }
      
      return 'Sorry, I encountered an error processing your query. Please try again.';
    }
  }

  public getWalletAddress(): string {
    return this.agent.wallet_address.toString();
  }

  public getTools(): any[] {
    return this.tools;
  }
}