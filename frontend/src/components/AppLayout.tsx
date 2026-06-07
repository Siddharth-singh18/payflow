import {
  BarChart3,
  Bell,
  ChevronDown,
  Clock3,
  Crown,
  LayoutDashboard,
  Plus,
  QrCode,
  Receipt,
  Search,
  Send,
  Shield,
  UserRound,
  WalletCards
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logoutUser } from '../api/auth';
import { getNotifications, markNotificationsRead } from '../api/notifications';
import { getApiErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  greeting?: boolean;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { href: '/send', label: 'Send', icon: Send },
  { href: '/dashboard?tab=add', label: 'Add Money', icon: Plus },
  { href: '/history', label: 'History', icon: Clock3 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/qr', label: 'QR', icon: QrCode },
  { href: '/split', label: 'Split', icon: Receipt },
  { href: '/profile', label: 'Profile', icon: UserRound },
  { href: '/admin', label: 'Admin', icon: Shield }
];

export const AppLayout = ({ children, title, subtitle, greeting = false }: AppLayoutProps) => {
  const navigate = useNavigate();
  const isDark = useThemeStore((state) => state.theme) === 'dark';
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const refreshToken = useAuthStore((state) => state.tokens?.refreshToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(1),
    staleTime: 30000
  });
  const readMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      markAllRead();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await logoutUser(refreshToken);
      }
    },
    onSettled: () => {
      clearSession();
      void navigate('/login', { replace: true });
    }
  });

  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(
        notificationsQuery.data.notifications,
        notificationsQuery.data.unreadCount
      );
    }
  }, [notificationsQuery.data, setNotifications]);

  return (
    <main className="pf-page">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[268px] flex-col border-r px-4 py-6 shadow-[12px_0_50px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex dark:border-[#1e293b] dark:shadow-none"
        style={{ backgroundColor: 'var(--pf-sidebar-bg)', borderColor: 'var(--pf-card-border)' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-sidebar-glow opacity-60 dark:opacity-40" />
        <div className="relative flex items-center gap-4 px-2">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#00464c] to-[#16a394] text-white shadow-lg shadow-teal-900/25">
            <WalletCards size={22} />
          </span>
          <div>
            <p className="text-xl font-bold tracking-tight">PayFlow</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Wallet</p>
          </div>
        </div>

        <nav className="relative mt-9 flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  `flex h-12 items-center gap-4 rounded-xl px-4 text-[15px] font-medium transition ${
                    isActive ? 'pf-nav-active' : 'pf-nav-item'
                  }`
                }
                end={'end' in item ? item.end : false}
                key={item.href}
                to={item.href}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/0 text-current dark:bg-white/5">
                  <Icon size={20} />
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {isDark ? (
          <div className="relative mt-4 rounded-2xl border border-[#1e293b] bg-gradient-to-br from-[#111827] to-[#0f172a] p-5 text-center">
            <Crown className="mx-auto text-amber-400" size={28} />
            <p className="mt-3 text-sm font-bold text-white">Go Premium</p>
            <p className="mt-1 text-[11px] text-slate-400">Unlock higher limits & rewards</p>
            <button
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#00c896] to-[#008a68] py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:brightness-110"
              type="button"
            >
              Upgrade Now
            </button>
          </div>
        ) : (
          <div className="relative mt-4 rounded-2xl border border-teal-100/80 bg-gradient-to-br from-[#dffdf7] via-[#ecfffb] to-[#d7fbf5] p-5 text-center shadow-[0_18px_45px_rgba(20,184,166,0.14)]">
            <div className="mx-auto grid h-20 w-24 place-items-center">
              <div className="relative h-16 w-20">
                <span className="absolute left-4 top-5 h-10 w-12 rounded-lg bg-[#064e5a] shadow-lg" />
                <span className="absolute left-7 top-2 h-10 w-12 rotate-[-18deg] rounded-lg bg-[#0f766e]" />
                <span className="absolute right-0 top-7 grid h-6 w-6 place-items-center rounded-full bg-white text-orange-500 shadow">
                  <Send size={12} />
                </span>
                <span className="absolute left-0 top-0 h-6 w-6 rotate-12 rounded-lg bg-[#23c4ad]" />
              </div>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-950">Fast. Secure. Simple.</p>
            <p className="mt-1.5 text-[11px] font-medium text-[#0f766e]">Pay smarter with PayFlow</p>
            <button
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#064e3b] to-[#0f766e] py-2.5 text-[13px] font-semibold text-white shadow-lg transition hover:brightness-110"
              type="button"
            >
              Explore Features →
            </button>
          </div>
        )}
        <p className="relative mt-4 hidden text-center text-[10px] text-slate-400 dark:block">
          © 2025 PayFlow. All rights reserved.
        </p>
      </aside>

      <section className="lg:pl-[268px]">
        <header
          className="sticky top-0 z-20 border-b px-5 py-4 backdrop-blur-xl sm:px-7"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--pf-page-bg) 88%, transparent)',
            borderColor: 'var(--pf-card-border)'
          }}
        >
          <div className="mx-auto grid max-w-[1360px] gap-4 xl:grid-cols-[1fr_minmax(320px,420px)_auto] xl:items-center">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {greeting ? `Welcome back, ${firstName}! 👋` : title}
                {!greeting && title === 'Dashboard' ? ' 👋' : null}
              </h1>
              {subtitle ? (
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
              ) : null}
            </div>
            <label className="pf-card hidden h-[46px] items-center gap-3 px-5 xl:flex">
              <Search className="text-slate-400 dark:text-slate-500" size={18} />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
                placeholder="Search transactions, contacts..."
                type="search"
              />
              <span className="rounded-md border px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--pf-card-border)' }}>
                Ctrl K
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 xl:justify-end">
              <label className="pf-card flex h-[46px] flex-1 items-center gap-3 px-4 xl:hidden">
                <Search className="text-slate-400" size={18} />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 dark:text-slate-200"
                  placeholder="Search..."
                  type="search"
                />
              </label>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <ThemeToggle />
                <div className="group relative">
                  <button
                    aria-label="Notifications"
                    className="pf-card relative grid h-[46px] w-[46px] place-items-center text-slate-600 transition hover:border-[#0f766e]/40 hover:text-[#0f766e] dark:text-slate-300 dark:hover:text-teal-300"
                    type="button"
                  >
                    <Bell size={21} />
                    {unreadCount > 0 ? (
                      <span className="absolute right-2 top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </button>
                  <div className="invisible absolute right-0 top-14 z-30 w-80 rounded-2xl border border-slate-200 bg-white p-3 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-payflow-dark-border dark:bg-payflow-ink">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Notifications</p>
                      <button
                        className="text-xs font-semibold text-payflow-teal disabled:opacity-50 dark:text-payflow-mint"
                        disabled={readMutation.isPending || unreadCount === 0}
                        onClick={() => {
                          readMutation.mutate();
                        }}
                        type="button"
                      >
                        Mark read
                      </button>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 6).map((notification) => (
                          <article
                            className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-payflow-dark-bg/80"
                            key={notification.id}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">{notification.title}</p>
                              {!notification.isRead ? (
                                <span className="mt-1 h-2 w-2 rounded-full bg-payflow-coral" />
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {notification.message}
                            </p>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-payflow-dark-border dark:text-slate-400">
                          No notifications yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="pf-card hidden h-[46px] items-center gap-2 pl-2 pr-1 sm:flex">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-payflow-teal-dark to-payflow-teal text-[13px] font-bold text-white shadow-md">
                    {(user?.name ?? 'PF')
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div className="min-w-0 pr-1">
                    <p className="max-w-[120px] truncate text-[13px] font-semibold">
                      {user?.name ?? 'PayFlow User'}
                    </p>
                    <p className="max-w-[120px] truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    aria-label="Account menu"
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-[#1e293b]"
                    onClick={() => {
                      logoutMutation.mutate();
                    }}
                    type="button"
                  >
                    <ChevronDown size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200/80 bg-white/95 px-2 backdrop-blur dark:border-payflow-dark-border dark:bg-payflow-ink/95 lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  `flex h-14 min-w-[4.5rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                    isActive
                      ? 'text-payflow-teal dark:text-payflow-mint'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                }
                key={item.href}
                to={item.href}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mx-auto max-w-[1360px] px-5 py-6 sm:px-7">{children}</div>
      </section>
    </main>
  );
};
