import { Queue } from 'bullmq';
import { redisConnection } from '../services/import.queue';

export const slaQueue = new Queue('sla', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 * 24 }, // Keep completed SLA jobs for 24 hours
    removeOnFail: { age: 3600 * 24 * 7 }, // Keep failed SLA jobs for 7 days
  },
});
