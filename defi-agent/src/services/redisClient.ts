import { createClient, RedisClientType } from 'redis';
import { AgentMessage } from '../../../shared/types.js';

export class DeFiRedisClient {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private isConnected: boolean = false;

  constructor(url?: string) {
    const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    this.client.on('connect', () => {
      console.log('DeFi Agent connected to Redis');
      this.isConnected = true;
    });
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect()
      ]);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await Promise.all([
        this.client.disconnect(),
        this.subscriber.disconnect()
      ]);
      this.isConnected = false;
    }
  }

  public async subscribeToTAPAgent(callback: (message: AgentMessage) => void): Promise<void> {
    await this.subscriber.subscribe('defi-agent-channel', (message) => {
      try {
        const agentMessage: AgentMessage = JSON.parse(message);
        callback(agentMessage);
      } catch (error) {
        console.error('Error parsing agent message:', error);
      }
    });
    
    console.log('🔗 Subscribed to TAP agent messages');
  }

  public async publishToTAP(message: AgentMessage): Promise<void> {
    await this.client.publish('tap-agent-channel', JSON.stringify(message));
  }

  public async storeUserPosition(userId: string, position: any): Promise<void> {
    const key = `defi:position:${userId}`;
    await this.client.hSet(key, position);
  }

  public async getUserPositions(userId: string): Promise<any> {
    const key = `defi:position:${userId}`;
    return await this.client.hGetAll(key);
  }

  public async updateYieldData(poolId: string, yieldData: any): Promise<void> {
    const key = `defi:yield:${poolId}`;
    await this.client.setEx(key, 300, JSON.stringify(yieldData)); // 5 min expiry
  }

  public async getYieldData(poolId: string): Promise<any | null> {
    const key = `defi:yield:${poolId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async logTransaction(userId: string, txData: any): Promise<void> {
    const key = `defi:transactions:${userId}`;
    await this.client.lPush(key, JSON.stringify({
      ...txData,
      timestamp: Date.now()
    }));
    
    // Keep only last 100 transactions
    await this.client.lTrim(key, 0, 99);
  }

  public async getUserTransactions(userId: string, limit: number = 10): Promise<any[]> {
    const key = `defi:transactions:${userId}`;
    const transactions = await this.client.lRange(key, 0, limit - 1);
    return transactions.map(tx => JSON.parse(tx));
  }
}