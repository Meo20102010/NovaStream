import Redis from 'ioredis';

let redis: Redis | null = null;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 10) return null;
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    enableReadyCheck: false,
    connectTimeout: 5000,
  });

  redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });
} else {
  console.log('⚠️  No REDIS_URL set, running without Redis');
}

export { redis };
export default redis;
