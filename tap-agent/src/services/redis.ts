import { createClient, RedisClientType } from 'redis';

export class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(url?: string) {
    this.client = createClient({
      url: url || process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  public async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  public async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  public async lpush(key: string, value: string): Promise<number> {
    return await this.client.lPush(key, value);
  }

  public async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }

  public async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, callback);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async del(key: string): Promise<number> {
    return await this.client.del(key);
  }
}