/**
 * Safe Yatra — Backend Spatial Server
 * Redis client singleton for caching, pub/sub, and live sessions.
 */

import Redis from 'ioredis';
import { env } from './env';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Factory to instantiate a Redis client with resilient reconnect policies.
 */
export const createRedisClient = (redisUrl: string = env.REDIS_URL): Redis => {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: env.NODE_ENV === 'test',
    retryStrategy(times) {
      const delay = Math.min(times * 100, 2000);
      return delay;
    },
  });

  client.on('error', (err) => {
    if (env.NODE_ENV !== 'test') {
      console.error('⚠️ [Redis] Connection error:', err.message);
    }
  });

  client.on('connect', () => {
    if (env.NODE_ENV === 'development') {
      console.log('✅ [Redis] Connected successfully');
    }
  });

  return client;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
