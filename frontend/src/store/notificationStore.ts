import { create } from 'zustand';
import type { NotificationItem } from '../types/notification';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (notifications: NotificationItem[], unreadCount: number) => void;
  pushNotification: (notification: NotificationItem) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => {
    set({ notifications, unreadCount });
  },
  pushNotification: (notification) => {
    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);

      if (exists) {
        return state;
      }

      return {
        notifications: [notification, ...state.notifications].slice(0, 20),
        unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
      };
    });
  },
  markAllRead: () => {
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((notification) => ({ ...notification, isRead: true }))
    }));
  }
}));
