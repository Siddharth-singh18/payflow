import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useWalletStore } from '../store/walletStore';
import type { NotificationItem, PaymentSocketPayload } from '../types/notification';
import { formatMoney } from '../utils/format';

interface ServerToClientEvents {
  'socket:connected': (payload: { userId: string }) => void;
  'notification:new': (payload: { notification?: NotificationItem }) => void;
  'notification:read-all': (payload: { modifiedCount: number }) => void;
  'payment:sent': (payload: PaymentSocketPayload) => void;
  'payment:received': (payload: PaymentSocketPayload) => void;
}

interface ClientToServerEvents {
  ping: () => void;
}

type PayFlowSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const socketUrl = (): string => {
  const configuredUrl: unknown = import.meta.env.VITE_SOCKET_URL;
  return typeof configuredUrl === 'string' && configuredUrl.length > 0
    ? configuredUrl
    : 'http://localhost:5000';
};

export const useSocket = (): void => {
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const applyBalance = useWalletStore((state) => state.applyBalance);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const socket: PayFlowSocket = io(socketUrl(), {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800
    });

    const handleNotification = (payload: { notification?: NotificationItem }): void => {
      if (payload.notification) {
        pushNotification(payload.notification);
      }
    };

    const handlePayment = (payload: PaymentSocketPayload): void => {
      if (payload.notification) {
        pushNotification(payload.notification);
      }

      if (typeof payload.balance === 'number') {
        applyBalance(payload.balance);
      }

      if (typeof payload.amount === 'number') {
        toast.success(`Wallet updated by ${formatMoney(payload.amount)}`);
      }
    };

    socket.on('notification:new', handleNotification);
    socket.on('notification:read-all', () => {
      markAllRead();
    });
    socket.on('payment:sent', handlePayment);
    socket.on('payment:received', handlePayment);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('notification:read-all');
      socket.off('payment:sent', handlePayment);
      socket.off('payment:received', handlePayment);
      socket.disconnect();
    };
  }, [accessToken, applyBalance, markAllRead, pushNotification]);
};
