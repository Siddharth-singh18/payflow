import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { redis } from '../../src/config/redis.js';

let replSet: MongoMemoryReplSet | null = null;

export const connectTestDatabase = async (): Promise<void> => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });

  await mongoose.connect(replSet.getUri(), {
    dbName: 'payflow-test'
  });
};

export const clearTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== mongoose.STATES.connected) {
    return;
  }

  const collections = Object.values(mongoose.connection.collections);

  await Promise.all(collections.map((collection) => collection.deleteMany({})));

  const flushableRedis = redis as unknown as { flushall(): Promise<'OK'> };
  await flushableRedis.flushall();
};

export const disconnectTestDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  await replSet?.stop();
  replSet = null;
};
