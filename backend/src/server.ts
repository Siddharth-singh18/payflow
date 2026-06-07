import http from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { initializeSocket } from './config/socket.js';
import { startScheduleJob, stopScheduleJob } from './jobs/scheduleJob.js';

const app = createApp();
const server = http.createServer(app);
initializeSocket(server);

const startServer = async (): Promise<void> => {
  await connectDatabase();
  await connectRedis();
  startScheduleJob();

  server.listen(env.PORT, () => {
    console.log(`PayFlow API listening on port ${String(env.PORT)}`);
  });
};

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  console.log(`${signal} received. Shutting down PayFlow API`);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await stopScheduleJob();
    await disconnectRedis();
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('HTTP server shutdown failed', error);
    process.exit(1);
  }
};

process.on('SIGTERM', (signal) => {
  void shutdown(signal);
});

process.on('SIGINT', (signal) => {
  void shutdown(signal);
});

startServer().catch((error: unknown) => {
  console.error('Failed to start PayFlow API', error);
  process.exit(1);
});
