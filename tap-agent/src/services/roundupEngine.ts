import { RoundUpData, AgentMessage } from '../../../shared/types.js';
import { RedisClient } from './redis.js';

export class RoundUpEngine {
  private redis: RedisClient;
  private readonly THRESHOLD = 10.00; // $10 threshold

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  public calculateRoundUp(amount: number): number {
    return Math.ceil(amount) - amount;
  }

  public async processRoundUp(
    userId: string,
    transactionId: string,
    originalAmount: number
  ): Promise<RoundUpData> {
    const roundUpAmount = this.calculateRoundUp(originalAmount);
    
    // Get current accumulated total
    const currentTotal = await this.getAccumulatedTotal(userId);
    const newTotal = currentTotal + roundUpAmount;
    
    const roundUpData: RoundUpData = {
      userId,
      transactionId,
      originalAmount,
      roundUpAmount,
      accumulatedTotal: newTotal
    };

    // Store the round-up
    await this.storeRoundUp(roundUpData);
    
    // Check if threshold reached
    if (newTotal >= this.THRESHOLD && currentTotal < this.THRESHOLD) {
      await this.triggerDeFiDeposit(userId, newTotal);
    }

    return roundUpData;
  }

  private async getAccumulatedTotal(userId: string): Promise<number> {
    const total = await this.redis.get(`roundup:total:${userId}`);
    return total ? parseFloat(total) : 0;
  }

  private async storeRoundUp(data: RoundUpData): Promise<void> {
    // Store individual round-up record
    const roundUpKey = `roundup:${data.userId}:${data.transactionId}`;
    await this.redis.setex(roundUpKey, 3600 * 24 * 30, JSON.stringify(data)); // 30 days
    
    // Update accumulated total
    await this.redis.set(`roundup:total:${data.userId}`, data.accumulatedTotal.toString());
    
    // Add to user's transaction list
    await this.redis.lpush(`roundup:list:${data.userId}`, JSON.stringify(data));
  }

  private async triggerDeFiDeposit(userId: string, amount: number): Promise<void> {
    const message: AgentMessage = {
      id: `trigger_${userId}_${Date.now()}`,
      type: 'ROUND_UP_TRIGGER',
      timestamp: Date.now(),
      payload: {
        userId,
        amount,
        reason: 'threshold_reached'
      },
      agentId: 'tap-agent'
    };

    // Publish to DeFi agent
    await this.redis.publish('defi-agent-channel', JSON.stringify(message));
    
    console.log(`Triggered DeFi deposit for user ${userId}: $${amount}`);
  }

  public async getUserRoundUps(userId: string, limit: number = 10): Promise<RoundUpData[]> {
    const roundUps = await this.redis.lrange(`roundup:list:${userId}`, 0, limit - 1);
    return roundUps.map(data => JSON.parse(data));
  }

  public async resetAccumulatedTotal(userId: string): Promise<void> {
    await this.redis.set(`roundup:total:${userId}`, '0');
  }
}