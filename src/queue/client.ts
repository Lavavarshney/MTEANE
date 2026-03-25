import Redis from 'ioredis';
import { config } from '../config';

const redisOptions = {
  enableReadyCheck: false,
  maxRetriesPerRequest: null as null,
};

export const createRedisConnection = () => new Redis(config.REDIS_URL, redisOptions);

export const redis = createRedisConnection();
