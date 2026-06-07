import type http from 'node:http';
import { Server, type Socket } from 'socket.io';
import { getAllowedOrigins } from './cors.js';
import { verifyAccessToken } from '../services/tokenService.js';

interface ServerToClientEvents {
  'socket:connected': (payload: { userId: string }) => void;
  'notification:new': (payload: Record<string, unknown>) => void;
  'notification:read-all': (payload: { modifiedCount: number }) => void;
  'payment:sent': (payload: Record<string, unknown>) => void;
  'payment:received': (payload: Record<string, unknown>) => void;
}

interface ClientToServerEvents {
  ping: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId?: string;
  role?: 'user' | 'admin';
}

type PayFlowSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type PayFlowServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: PayFlowServer | null = null;

const getTokenFromSocket = (socket: PayFlowSocket): string | null => {
  const auth = socket.handshake.auth as Record<string, unknown>;
  const authToken = auth.token;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken;
  }

  const authorization = socket.handshake.headers.authorization;

  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }

  return null;
};

export const initializeSocket = (server: http.Server): PayFlowServer => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        next(new Error('Socket authentication token is required'));
        return;
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    if (typeof userId === 'string') {
      void socket.join(userId);
      socket.emit('socket:connected', { userId });
    }
  });

  return io;
};

export const getSocketServer = (): PayFlowServer | null => io;
