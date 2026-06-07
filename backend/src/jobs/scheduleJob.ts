import cron, { type ScheduledTask } from 'node-cron';
import { executeDueSchedules } from '../services/scheduleService.js';

let scheduleJob: ScheduledTask | null = null;

export const startScheduleJob = (): void => {
  if (scheduleJob) {
    return;
  }

  scheduleJob = cron.schedule('* * * * *', () => {
    executeDueSchedules().catch((error: unknown) => {
      console.error('Scheduled payment job failed', error);
    });
  });
};

export const stopScheduleJob = async (): Promise<void> => {
  if (!scheduleJob) {
    return;
  }

  await scheduleJob.stop();
  scheduleJob = null;
};
