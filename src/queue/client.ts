import Redis from 'ioredis';
import { config } from '../config';

const redisOptions = {
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

export const createRedisConnection = () => new Redis(config.REDIS_URL, redisOptions);

export const redis = createRedisConnection();

/**
 * Returns plain connection options (host/port) for BullMQ.
 * BullMQ bundles its own ioredis, so passing our Redis instance causes a type
 * conflict. Passing a plain options object avoids this entirely.
 */
export function getBullMQConnection() {
  const url = new URL(config.REDIS_URL);
  return {
    host: url.hostname,
    port: Number.parseInt(url.port || '6379', 10),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  };
}
