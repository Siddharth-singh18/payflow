import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Ban, CheckCircle2, ShieldAlert, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  getAdminFraudLogs,
  getAdminStats,
  getAdminTransactions,
  getAdminUsers,
  setAdminUserBlocked
} from '../api/admin';
import { getApiErrorMessage } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { Skeleton } from '../components/Skeleton';
import type { AdminTransactionsFilters, AdminUsersFilters } from '../api/admin';
import type { KycStatus } from '../types/admin';
import type { TransactionStatus } from '../types/transaction';
import { formatMoney } from '../utils/format';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export const AdminDashboardPage = () => {
  const queryClient = useQueryClient();
  const [userFilters, setUserFilters] = useState<AdminUsersFilters>({
    page: 1,
    limit: 8,
    search: '',
    kycStatus: ''
  });
  const [transactionFilters, setTransactionFilters] = useState<AdminTransactionsFilters>({
    page: 1,
    limit: 8,
    status: '',
    flagged: ''
  });
  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', userFilters],
    queryFn: () => getAdminUsers(userFilters)
  });
  const transactionsQuery = useQuery({
    queryKey: ['admin', 'transactions', transactionFilters],
    queryFn: () => getAdminTransactions(transactionFilters)
  });
  const fraudLogsQuery = useQuery({
    queryKey: ['admin', 'fraudLogs'],
    queryFn: () => getAdminFraudLogs(1)
  });
  const blockMutation = useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) =>
      setAdminUserBlocked(userId, isBlocked),
    onSuccess: async (_result, variables) => {
      toast.success(variables.isBlocked ? 'User blocked' : 'User unblocked');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });

  return (
    <AppLayout
      subtitle="Operational controls for users, transaction risk, and platform volume."
      title="Admin Dashboard"
    >
      {statsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStat icon={<Users size={20} />} label="Total users" value={String(statsQuery.data?.totalUsers ?? 0)} />
          <AdminStat
            icon={<CheckCircle2 size={20} />}
            label="Volume today"
            value={formatMoney(statsQuery.data?.totalVolumeToday ?? 0)}
          />
          <AdminStat
            icon={<ShieldAlert size={20} />}
            label="Flagged transactions"
            value={String(statsQuery.data?.flaggedCount ?? 0)}
          />
          <AdminStat
            icon={<AlertTriangle size={20} />}
            label="Revenue estimate"
            value={formatMoney(statsQuery.data?.revenue ?? 0)}
          />
        </div>
      )}

      <section className="pf-card mt-6 p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold">Users</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              onChange={(event) => {
                setUserFilters((current) => ({ ...current, search: event.target.value, page: 1 }));
              }}
              placeholder="Search users"
              value={userFilters.search}
            />
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              onChange={(event) => {
                setUserFilters((current) => ({
                  ...current,
                  kycStatus: event.target.value as KycStatus | '',
                  page: 1
                }));
              }}
              value={userFilters.kycStatus}
            >
              <option value="">All KYC</option>
              <option value="not_submitted">Not submitted</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">User</th>
                <th>KYC</th>
                <th>Wallet</th>
                <th>Transactions</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersQuery.data?.users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="capitalize">{user.kycStatus.replaceAll('_', ' ')}</td>
                  <td>{formatMoney(user.walletBalance)}</td>
                  <td>{user.transactionCount}</td>
                  <td>{user.isBlocked ? 'Blocked' : 'Active'}</td>
                  <td className="text-right">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:border-red-300 hover:text-red-600 disabled:opacity-60 dark:border-slate-800"
                      disabled={blockMutation.isPending}
                      onClick={() => {
                        blockMutation.mutate({ userId: user.id, isBlocked: !user.isBlocked });
                      }}
                      type="button"
                    >
                      <Ban size={15} />
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pf-card mt-6 p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold">Transactions</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              onChange={(event) => {
                setTransactionFilters((current) => ({
                  ...current,
                  status: event.target.value as TransactionStatus | '',
                  page: 1
                }));
              }}
              value={transactionFilters.status}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="flagged">Flagged</option>
            </select>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              onChange={(event) => {
                const value = event.target.value;
                setTransactionFilters((current) => ({
                  ...current,
                  flagged: value === '' ? '' : value === 'true',
                  page: 1
                }));
              }}
              value={String(transactionFilters.flagged)}
            >
              <option value="">All risk</option>
              <option value="true">Flagged</option>
              <option value="false">Clean</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">Reference</th>
                <th>User</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Fraud score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactionsQuery.data?.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="py-4 font-medium">{transaction.referenceId}</td>
                  <td>
                    <p className="font-semibold">{transaction.user.name ?? transaction.user.id}</p>
                    <p className="text-xs text-slate-500">{transaction.user.email}</p>
                  </td>
                  <td className={transaction.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}>
                    {formatMoney(transaction.amount)}
                  </td>
                  <td className="capitalize">{transaction.status}</td>
                  <td>
                    <span className={transaction.fraudScore >= 70 ? 'font-semibold text-red-600' : 'font-semibold'}>
                      {transaction.fraudScore}/100
                    </span>
                  </td>
                  <td>{dateFormat.format(new Date(transaction.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pf-card mt-6 p-6">
        <h2 className="text-base font-semibold">Fraud logs</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {fraudLogsQuery.data?.logs.length ? (
            fraudLogsQuery.data.logs.map((log) => (
              <article className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900" key={log.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{log.action}</p>
                    <p className="mt-1 text-xs text-slate-500">{dateFormat.format(new Date(log.createdAt))}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                    {log.fraudScore}/100
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {log.reasons.length ? log.reasons.join(', ') : 'No reasons recorded'}
                </p>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 lg:col-span-2">
              No fraud logs yet.
            </p>
          )}
        </div>
      </section>
    </AppLayout>
  );
};

const AdminStat = ({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <article className="pf-card p-6">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <span className="text-payflow-teal">{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-semibold tracking-normal">{value}</p>
  </article>
);
