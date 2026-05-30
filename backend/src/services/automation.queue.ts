import { Queue } from 'bullmq';
import { redisConnection } from './import.queue';

export const automationQueue = new Queue('automation', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 * 24 * 7 },
    removeOnFail: { age: 3600 * 24 * 14 },
  },
});
