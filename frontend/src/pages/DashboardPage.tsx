import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Clock3,
  Copy,
  Eye,
  IndianRupee,
  Plus,
  QrCode,
  Send,
  Shield,
  TrendingUp,
  WalletCards
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getTransactions } from '../api/transactions';
import { getWalletBalance } from '../api/wallet';
import { AppLayout } from '../components/AppLayout';
import { Skeleton } from '../components/Skeleton';
import { TransactionRow } from '../components/TransactionRow';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';
import type { TransactionItem } from '../types/transaction';
import { formatMoney } from '../utils/format';

interface ChartPoint {
  day: string;
  amount: number;
}

const buildLastSevenDays = (transactions: TransactionItem[]): ChartPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    const amount = transactions
      .filter((transaction) => transaction.type === 'debit')
      .filter((transaction) => transaction.createdAt.slice(0, 10) === key)
      .reduce((total, transaction) => total + transaction.amount, 0);

    return {
      day: formatter.format(date),
      amount
    };
  });
};

export const DashboardPage = () => {
  const isDark = useThemeStore((state) => state.theme) === 'dark';
  const chartGrid = isDark ? '#1e293b' : '#dbe7f3';
  const chartTick = isDark ? '#94a3b8' : '#64748b';
  const cachedWallet = useWalletStore((state) => state.wallet);
  const setWallet = useWalletStore((state) => state.setWallet);
  const walletQuery = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
    refetchInterval: 30000
  });
  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'dashboard'],
    queryFn: () => getTransactions({ page: 1, limit: 20 })
  });

  const recentTransactions = transactionsQuery.data?.transactions.slice(0, 5) ?? [];
  const chartData = useMemo(
    () => buildLastSevenDays(transactionsQuery.data?.transactions ?? []),
    [transactionsQuery.data?.transactions]
  );
  const wallet = walletQuery.data ?? cachedWallet;
  const totalSpent = chartData.reduce((total, point) => total + point.amount, 0);
  const averageSpend = chartData.length > 0 ? totalSpent / chartData.length : 0;

  useEffect(() => {
    if (walletQuery.data) {
      setWallet(walletQuery.data);
    }
  }, [setWallet, walletQuery.data]);

  return (
    <AppLayout
      greeting
      subtitle="Here's what's happening with your wallet today."
      title="Dashboard"
    >
      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.95fr]">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="pf-wallet-card min-h-[260px]"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_78%_22%,rgba(255,255,255,0.22)_0,transparent_24%),radial-gradient(circle_at_88%_78%,rgba(255,255,255,0.14)_0,transparent_22%)]" />
          <div className="absolute -right-28 -top-20 h-72 w-96 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute bottom-8 right-10 grid grid-cols-8 gap-2 opacity-20">
            {Array.from({ length: 64 }, (_, index) => (
              <span className="h-1.5 w-1.5 rounded-full bg-white" key={index} />
            ))}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="relative">
              <p className="text-sm font-medium text-emerald-50">Available balance</p>
              {walletQuery.isLoading ? (
                <Skeleton className="mt-4 h-12 w-56 bg-white/25" />
              ) : (
                <div className="mt-4 flex items-center gap-4">
                  <motion.p
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-5xl font-bold tracking-normal"
                    initial={{ opacity: 0, scale: 0.98 }}
                    key={wallet?.balance ?? 0}
                  >
                    {formatMoney(wallet?.balance ?? 0)}
                  </motion.p>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white shadow-inner backdrop-blur-md">
                    <Eye size={18} />
                  </span>
                </div>
              )}
            </div>
            <span className="relative grid h-14 w-14 place-items-center rounded-xl bg-white/95 text-[#004a50] shadow-[0_18px_35px_rgba(15,23,42,0.16)] dark:bg-white dark:text-payflow-teal-dark">
              <WalletCards size={22} />
            </span>
          </div>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-[1.05fr_0.95fr]">
            <p className="rounded-xl border border-white/10 bg-white/10 p-4 text-[13px] shadow-inner backdrop-blur-md">
              <span className="block text-emerald-50/80">Virtual account</span>
              <span className="mt-1 flex items-center justify-between gap-3 text-base font-bold">
                {wallet?.virtualAccountNumber ?? 'Loading'}
                <Copy className="shrink-0 text-emerald-50/80" size={16} />
              </span>
            </p>
            <p className="rounded-xl border border-white/10 bg-white/10 p-4 text-[13px] shadow-inner backdrop-blur-md">
              <span className="block text-emerald-50/80">Wallet status</span>
              <span className="mt-1 flex items-center justify-between gap-3 text-base font-bold">
                {wallet?.isFrozen ? 'Frozen' : 'Active'}
                <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_0_4px_rgba(190,242,100,0.2)]" />
              </span>
            </p>
          </div>
        </motion.section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link className="group pf-action-tile" to="/send">
            <span className="grid h-[50px] w-[50px] place-items-center rounded-xl bg-teal-50 text-payflow-teal shadow-inner dark:bg-teal-950/50 dark:text-payflow-mint">
              <Send size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Send Money</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Pay by email or phone
              </span>
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-payflow-teal group-hover:bg-payflow-teal group-hover:text-white dark:border-slate-700 dark:group-hover:border-payflow-teal">
              <span className="text-sm font-medium leading-none">›</span>
            </span>
          </Link>
          <Link className="group pf-action-tile" to="/dashboard">
            <span className="grid h-[50px] w-[50px] place-items-center rounded-xl bg-lime-50 text-lime-700 shadow-inner dark:bg-[#3f6212]/30 dark:text-[#d9f99d]">
              <Plus size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Add Money</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Razorpay checkout
              </span>
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-payflow-teal group-hover:bg-payflow-teal group-hover:text-white dark:border-slate-700 dark:group-hover:border-payflow-teal">
              <span className="text-sm font-medium leading-none">›</span>
            </span>
          </Link>
          <Link className="group pf-action-tile" to="/qr">
            <span className="grid h-[50px] w-[50px] place-items-center rounded-xl bg-orange-50 text-payflow-coral shadow-inner dark:bg-orange-950/50 dark:text-orange-300">
              <QrCode size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Scan QR</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Pay a QR payload
              </span>
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-payflow-teal group-hover:bg-payflow-teal group-hover:text-white dark:border-slate-700 dark:group-hover:border-payflow-teal">
              <span className="text-sm font-medium leading-none">›</span>
            </span>
          </Link>
          <Link className="group pf-action-tile" to="/history">
            <span className="grid h-[50px] w-[50px] place-items-center rounded-xl bg-blue-50 text-blue-600 shadow-inner dark:bg-blue-900/30 dark:text-blue-300">
              <IndianRupee size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Request</span>
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                Review activity
              </span>
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-payflow-teal group-hover:bg-payflow-teal group-hover:text-white dark:border-slate-700 dark:group-hover:border-payflow-teal">
              <span className="text-sm font-medium leading-none">›</span>
            </span>
          </Link>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.12fr_0.95fr]">
        <section className="pf-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[15px] font-bold">Spending Overview</h2>
              <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">Total Spending</p>
              <div className="mt-1 flex items-baseline gap-3">
                <p className="text-2xl font-bold">{formatMoney(totalSpent)}</p>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-payflow-teal dark:bg-teal-900/30 dark:text-payflow-mint">↓ 0%</span>
                <span className="text-[11px] text-slate-400">vs last 7 days</span>
              </div>
            </div>
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm dark:border-payflow-dark-border dark:bg-payflow-dark-bg"
              type="button"
            >
              Last 7 days
              <span className="text-slate-400">▾</span>
            </button>
          </div>
          <div className="mt-4 h-52">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} strokeDasharray="3 5" vertical={false} />
                <XAxis axisLine={false} dataKey="day" stroke={chartTick} tick={{ fill: chartTick }} tickLine={false} />
                <YAxis
                  axisLine={false}
                  stroke={chartTick}
                  tick={{ fill: chartTick }}
                  tickFormatter={(value) => `₹${String(value)}`}
                  tickLine={false}
                  width={44}
                />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Area
                  activeDot={{ r: 7, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 3 }}
                  dataKey="amount"
                  dot={{ r: 4, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
                  fill="url(#spendingGradient)"
                  stroke="#0f766e"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.03)] dark:border-payflow-dark-border dark:bg-payflow-dark-bg">
              <TrendingUp className="text-payflow-teal dark:text-payflow-mint" size={18} />
              <p className="mt-3 text-sm font-bold">{formatMoney(totalSpent)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Received</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.03)] dark:border-payflow-dark-border dark:bg-payflow-dark-bg">
              <Send className="text-blue-600 dark:text-blue-400" size={18} />
              <p className="mt-3 text-sm font-bold">{formatMoney(totalSpent)}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Sent</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.03)] dark:border-payflow-dark-border dark:bg-payflow-dark-bg">
              <Clock3 className="text-purple-600 dark:text-purple-400" size={18} />
              <p className="mt-3 text-sm font-bold">{recentTransactions.length}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Transactions</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.03)] dark:border-payflow-dark-border dark:bg-payflow-dark-bg">
              <Shield className="text-orange-500 dark:text-orange-400" size={18} />
              <p className="mt-3 text-sm font-bold">100%</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Security</p>
            </div>
          </div>
        </section>

        <section className="pf-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold">Recent Transactions</h2>
            <Link
              className="text-xs font-semibold text-payflow-teal hover:underline dark:text-payflow-mint"
              to="/history"
            >
              View all →
            </Link>
          </div>
          {transactionsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          ) : (
            <div className="relative grid min-h-[330px] place-items-center overflow-hidden rounded-xl bg-slate-50 p-8 text-center dark:bg-payflow-dark-bg/50">
              <div>
                <div className="relative mx-auto h-24 w-24">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-payflow-teal to-payflow-teal-dark shadow-xl" />
                  <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-white/30" />
                  <div className="absolute bottom-3 right-3 h-8 w-12 rounded-lg bg-white/20 backdrop-blur-sm" />
                </div>
                <p className="mt-6 text-sm font-bold text-slate-900 dark:text-white">No transactions yet</p>
                <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Once you send, receive or add money, your transactions will appear here.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};
