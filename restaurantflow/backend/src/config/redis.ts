import Redis from 'ioredis';
import { env } from './env';

class ResilientCacheService {
  private redisClient: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt: number | null }> = new Map();
  private isRedisAvailable = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    if (env.NODE_ENV === 'test') {
      this.isRedisAvailable = false;
      return;
    }

    try {
      this.redisClient = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop reconnecting after 3 attempts in local dev
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.redisClient.connect().then(() => {
        this.isRedisAvailable = true;
        console.log('✅ Redis connected successfully.');
      }).catch(() => {
        this.isRedisAvailable = false;
        console.warn('⚠️ Redis connection unavailable. Using high-performance in-memory fallback store.');
      });

      this.redisClient.on('error', () => {
        this.isRedisAvailable = false;
      });

      this.redisClient.on('ready', () => {
        this.isRedisAvailable = true;
      });
    } catch {
      this.isRedisAvailable = false;
      console.warn('⚠️ Redis initialization fallback active.');
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch {
        // Fallback to memory
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        if (ttlSeconds) {
          await this.redisClient.setex(key, ttlSeconds, value);
        } else {
          await this.redisClient.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryStore.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // Ignore
      }
    }
    this.memoryStore.delete(key);
  }

  public async getClient(): Promise<Redis | null> {
    return this.isRedisAvailable ? this.redisClient : null;
  }
}

export const cacheService = new ResilientCacheService();
