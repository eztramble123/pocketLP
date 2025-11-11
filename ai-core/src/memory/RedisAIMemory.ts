import { Redis } from 'redis';
import { 
  AgentMemory, 
  ConversationMessage, 
  UserProfile, 
  Transaction, 
  Investment,
  AgentDecision,
  AIContext,
  LearnedPatterns,
  UserPreferences
} from '../types/AITypes.js';
import { Logger } from '../utils/Logger.js';

export class RedisAIMemory {
  private redis: Redis;
  private logger: Logger;
  private readonly TTL = {
    SHORT_TERM: 3600, // 1 hour
    MEDIUM_TERM: 86400 * 7, // 1 week
    LONG_TERM: 86400 * 365, // 1 year
    PERMANENT: -1 // No expiration
  };

  constructor(redisUrl?: string, logger?: Logger) {
    this.redis = new Redis({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true
    });

    this.logger = logger || new Logger('RedisAIMemory');
  }

  public async connect(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('Redis AI Memory connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis AI Memory:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('Redis AI Memory disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting Redis AI Memory:', error);
    }
  }

  // Conversation Memory Management
  public async storeConversation(userId: string, agentId: string, message: ConversationMessage): Promise<void> {
    const key = `conversation:${userId}:${agentId}`;
    
    // Store in conversation history
    await this.redis.lpush(key, JSON.stringify(message));
    
    // Keep only last 100 messages
    await this.redis.ltrim(key, 0, 99);
    
    // Set expiration
    await this.redis.expire(key, this.TTL.MEDIUM_TERM);
    
    // Update conversation context
    await this.updateConversationContext(userId, agentId, message);
  }

  public async getConversationHistory(userId: string, agentId: string, limit: number = 50): Promise<ConversationMessage[]> {
    const key = `conversation:${userId}:${agentId}`;
    const messages = await this.redis.lrange(key, 0, limit - 1);
    
    return messages.map(msg => JSON.parse(msg));
  }

  private async updateConversationContext(userId: string, agentId: string, message: ConversationMessage): Promise<void> {
    const contextKey = `context:${userId}:${agentId}`;
    
    // Extract intent and entities from message
    const context = {
      lastIntent: this.extractIntent(message.content),
      lastEntities: this.extractEntities(message.content),
      sentiment: this.analyzeSentiment(message.content),
      timestamp: Date.now()
    };
    
    await this.redis.setex(contextKey, this.TTL.SHORT_TERM, JSON.stringify(context));
  }

  // User Profile and Preferences
  public async storeUserProfile(profile: UserProfile): Promise<void> {
    const key = `profile:${profile.userId}`;
    await this.redis.setex(key, this.TTL.LONG_TERM, JSON.stringify(profile));
    
    // Store preferences separately for quick access
    await this.storeUserPreferences(profile.userId, profile.preferences);
  }

  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = `profile:${userId}`;
    const profile = await this.redis.get(key);
    
    return profile ? JSON.parse(profile) : null;
  }

  public async storeUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    const key = `preferences:${userId}`;
    await this.redis.setex(key, this.TTL.LONG_TERM, JSON.stringify(preferences));
  }

  public async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    const key = `preferences:${userId}`;
    const prefs = await this.redis.get(key);
    
    return prefs ? JSON.parse(prefs) : null;
  }

  public async updateUserPreference(userId: string, key: string, value: any): Promise<void> {
    const preferences = await this.getUserPreferences(userId) || {};
    (preferences as any)[key] = value;
    await this.storeUserPreferences(userId, preferences);
  }

  // Transaction and Investment History
  public async storeTransaction(userId: string, transaction: Transaction): Promise<void> {
    const key = `transactions:${userId}`;
    
    // Add to transaction list
    await this.redis.lpush(key, JSON.stringify(transaction));
    
    // Keep last 1000 transactions
    await this.redis.ltrim(key, 0, 999);
    
    // Update transaction patterns
    await this.updateTransactionPatterns(userId, transaction);
  }

  public async getUserTransactionHistory(userId: string, limit: number = 100): Promise<Transaction[]> {
    const key = `transactions:${userId}`;
    const transactions = await this.redis.lrange(key, 0, limit - 1);
    
    return transactions.map(tx => JSON.parse(tx));
  }

  public async storeInvestment(userId: string, investment: Investment): Promise<void> {
    const key = `investments:${userId}`;
    const investmentKey = `investment:${userId}:${investment.id}`;
    
    // Store individual investment
    await this.redis.setex(investmentKey, this.TTL.LONG_TERM, JSON.stringify(investment));
    
    // Add to user's investment list
    await this.redis.sadd(key, investment.id);
  }

  public async getUserInvestments(userId: string): Promise<Investment[]> {
    const key = `investments:${userId}`;
    const investmentIds = await this.redis.smembers(key);
    
    const investments: Investment[] = [];
    for (const id of investmentIds) {
      const investmentKey = `investment:${userId}:${id}`;
      const investment = await this.redis.get(investmentKey);
      if (investment) {
        investments.push(JSON.parse(investment));
      }
    }
    
    return investments;
  }

  // Decision and Learning Storage
  public async storeDecision(userId: string, decision: AgentDecision, context: AIContext): Promise<void> {
    const decisionKey = `decision:${userId}:${Date.now()}`;
    
    const decisionData = {
      decision,
      context: {
        operation: context.operation,
        marketData: context.marketData,
        userProfile: {
          userId: context.userProfile.userId,
          riskTolerance: context.userProfile.riskTolerance
        }
      },
      timestamp: Date.now()
    };
    
    await this.redis.setex(decisionKey, this.TTL.LONG_TERM, JSON.stringify(decisionData));
    
    // Add to user's decision history
    const historyKey = `decisions:${userId}`;
    await this.redis.lpush(historyKey, decisionKey);
    await this.redis.ltrim(historyKey, 0, 99); // Keep last 100 decisions
  }

  public async getDecisionHistory(userId: string, limit: number = 20): Promise<any[]> {
    const historyKey = `decisions:${userId}`;
    const decisionKeys = await this.redis.lrange(historyKey, 0, limit - 1);
    
    const decisions = [];
    for (const key of decisionKeys) {
      const decision = await this.redis.get(key);
      if (decision) {
        decisions.push(JSON.parse(decision));
      }
    }
    
    return decisions;
  }

  // Learning Patterns
  public async storeUserPatterns(userId: string, patterns: LearnedPatterns): Promise<void> {
    const key = `patterns:${userId}`;
    await this.redis.setex(key, this.TTL.LONG_TERM, JSON.stringify(patterns));
  }

  public async getUserPatterns(userId: string): Promise<LearnedPatterns | null> {
    const key = `patterns:${userId}`;
    const patterns = await this.redis.get(key);
    
    return patterns ? JSON.parse(patterns) : null;
  }

  private async updateTransactionPatterns(userId: string, transaction: Transaction): Promise<void> {
    // Update spending patterns based on new transaction
    const patternsKey = `spending_patterns:${userId}`;
    
    const currentPatterns = await this.redis.get(patternsKey);
    const patterns = currentPatterns ? JSON.parse(currentPatterns) : {
      categories: {},
      merchants: {},
      timePatterns: {},
      amounts: []
    };
    
    // Update category patterns
    patterns.categories[transaction.category] = (patterns.categories[transaction.category] || 0) + 1;
    
    // Update merchant patterns
    if (transaction.merchant) {
      patterns.merchants[transaction.merchant] = (patterns.merchants[transaction.merchant] || 0) + 1;
    }
    
    // Update time patterns (hour of day)
    const hour = new Date(transaction.timestamp).getHours();
    patterns.timePatterns[hour] = (patterns.timePatterns[hour] || 0) + 1;
    
    // Update amount history (keep last 100)
    patterns.amounts.push(transaction.amount);
    if (patterns.amounts.length > 100) {
      patterns.amounts = patterns.amounts.slice(-100);
    }
    
    await this.redis.setex(patternsKey, this.TTL.LONG_TERM, JSON.stringify(patterns));
  }

  // Agent Coordination Memory
  public async storeAgentInteraction(agentId: string, targetAgent: string, interaction: any): Promise<void> {
    const key = `agent_interactions:${agentId}:${targetAgent}`;
    
    await this.redis.lpush(key, JSON.stringify({
      ...interaction,
      timestamp: Date.now()
    }));
    
    // Keep last 50 interactions
    await this.redis.ltrim(key, 0, 49);
    await this.redis.expire(key, this.TTL.MEDIUM_TERM);
  }

  public async getAgentInteractions(agentId: string, targetAgent: string): Promise<any[]> {
    const key = `agent_interactions:${agentId}:${targetAgent}`;
    const interactions = await this.redis.lrange(key, 0, -1);
    
    return interactions.map(i => JSON.parse(i));
  }

  // Context and State Management
  public async storeSessionContext(userId: string, agentId: string, context: any): Promise<void> {
    const key = `session:${userId}:${agentId}`;
    await this.redis.setex(key, this.TTL.SHORT_TERM, JSON.stringify(context));
  }

  public async getSessionContext(userId: string, agentId: string): Promise<any> {
    const key = `session:${userId}:${agentId}`;
    const context = await this.redis.get(key);
    
    return context ? JSON.parse(context) : null;
  }

  public async clearSessionContext(userId: string, agentId: string): Promise<void> {
    const key = `session:${userId}:${agentId}`;
    await this.redis.del(key);
  }

  // Goal Tracking
  public async storeUserGoals(userId: string, goals: any[]): Promise<void> {
    const key = `goals:${userId}`;
    await this.redis.setex(key, this.TTL.LONG_TERM, JSON.stringify(goals));
  }

  public async getUserGoals(userId: string): Promise<any[]> {
    const key = `goals:${userId}`;
    const goals = await this.redis.get(key);
    
    return goals ? JSON.parse(goals) : [];
  }

  public async updateGoalProgress(userId: string, goalId: string, progress: any): Promise<void> {
    const key = `goal_progress:${userId}:${goalId}`;
    await this.redis.setex(key, this.TTL.LONG_TERM, JSON.stringify({
      ...progress,
      lastUpdated: Date.now()
    }));
  }

  // Analytics and Insights
  public async storeAnalytics(userId: string, type: string, data: any): Promise<void> {
    const key = `analytics:${userId}:${type}`;
    
    await this.redis.lpush(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    // Keep last 100 analytics entries
    await this.redis.ltrim(key, 0, 99);
    await this.redis.expire(key, this.TTL.LONG_TERM);
  }

  public async getAnalytics(userId: string, type: string, limit: number = 50): Promise<any[]> {
    const key = `analytics:${userId}:${type}`;
    const analytics = await this.redis.lrange(key, 0, limit - 1);
    
    return analytics.map(a => JSON.parse(a));
  }

  // Utility methods for context extraction
  private extractIntent(content: string): string {
    // Simple intent extraction - in production, use NLP models
    const intents = {
      'balance': ['balance', 'how much', 'total'],
      'yield': ['yield', 'return', 'profit', 'apy'],
      'invest': ['invest', 'deposit', 'put money'],
      'risk': ['risk', 'safe', 'dangerous'],
      'question': ['what', 'how', 'why', 'when', 'where']
    };
    
    const lowerContent = content.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return intent;
      }
    }
    
    return 'general';
  }

  private extractEntities(content: string): any[] {
    // Simple entity extraction - in production, use NLP models
    const entities = [];
    
    // Extract amounts
    const amountRegex = /\$?(\d+(?:\.\d{2})?)/g;
    let match;
    while ((match = amountRegex.exec(content)) !== null) {
      entities.push({
        type: 'amount',
        value: parseFloat(match[1]),
        text: match[0]
      });
    }
    
    // Extract percentages
    const percentRegex = /(\d+(?:\.\d+)?)\s*%/g;
    while ((match = percentRegex.exec(content)) !== null) {
      entities.push({
        type: 'percentage',
        value: parseFloat(match[1]),
        text: match[0]
      });
    }
    
    return entities;
  }

  private analyzeSentiment(content: string): number {
    // Simple sentiment analysis - in production, use sentiment analysis library
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'angry'];
    
    const lowerContent = content.toLowerCase();
    let sentiment = 0;
    
    positiveWords.forEach(word => {
      if (lowerContent.includes(word)) sentiment += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerContent.includes(word)) sentiment -= 1;
    });
    
    return Math.max(-1, Math.min(1, sentiment / 10)); // Normalize to -1 to 1
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}