import type { CorsOptions } from 'cors';
import { env } from './env.js';

const developmentOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

export const getAllowedOrigins = (): string[] => {
  const origins = new Set<string>([env.FRONTEND_URL]);

  if (env.NODE_ENV !== 'production') {
    developmentOrigins.forEach((origin) => origins.add(origin));
  }

  return [...origins];
};

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || getAllowedOrigins().includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked origin: ${origin}`));
  }
};
