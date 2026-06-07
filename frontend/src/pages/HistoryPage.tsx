import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Filter, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getTransactions } from '../api/transactions';
import { AppLayout } from '../components/AppLayout';
import { Skeleton } from '../components/Skeleton';
import { TransactionRow } from '../components/TransactionRow';
import { EmptyState } from '../components/ui/EmptyState';
import { PageCard, PageCardHeader } from '../components/ui/PageCard';
import type { TransactionFilters, TransactionStatus, TransactionType } from '../types/transaction';
import { formatMoney } from '../utils/format';

const defaultFilters: TransactionFilters = {
  page: 1,
  limit: 10,
  type: '',
  status: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: ''
};

export const HistoryPage = () => {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const transactionsQuery = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters)
  });
  const pagination = transactionsQuery.data?.pagination;
  const transactions = transactionsQuery.data?.transactions ?? [];

  const summary = useMemo(() => {
    const credits = transactions
      .filter((t) => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    const debits = transactions
      .filter((t) => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    return { credits, debits, count: transactions.length };
  }, [transactions]);

  const updateFilter = (next: Partial<TransactionFilters>): void => {
    setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  };

  return (
    <AppLayout subtitle="Search, filter, and inspect wallet movement." title="History">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <article className="pf-card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <ArrowDownLeft size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Received (page)</p>
            <p className="text-lg font-bold">{formatMoney(summary.credits)}</p>
          </div>
        </article>
        <article className="pf-card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <ArrowUpRight size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sent (page)</p>
            <p className="text-lg font-bold">{formatMoney(summary.debits)}</p>
          </div>
        </article>
        <article className="pf-card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Receipt size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">On this page</p>
            <p className="text-lg font-bold">{summary.count}</p>
          </div>
        </article>
      </div>

      <PageCard>
        <PageCardHeader
          description="Narrow down by type, status, date, or amount range."
          icon={<Filter size={20} />}
          title="Filters"
        />
        <div className="grid gap-3 md:grid-cols-4">
          <select
            className="pf-select"
            onChange={(event) => {
              updateFilter({ type: event.target.value as TransactionType | '' });
            }}
            value={filters.type}
          >
            <option value="">All types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="refund">Refund</option>
          </select>
          <select
            className="pf-select"
            onChange={(event) => {
              updateFilter({ status: event.target.value as TransactionStatus | '' });
            }}
            value={filters.status}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="flagged">Flagged</option>
          </select>
          <input
            className="pf-input"
            onChange={(event) => {
              updateFilter({ startDate: event.target.value });
            }}
            type="date"
            value={filters.startDate}
          />
          <input
            className="pf-input"
            onChange={(event) => {
              updateFilter({ endDate: event.target.value });
            }}
            type="date"
            value={filters.endDate}
          />
          <input
            className="pf-input"
            min={0}
            onChange={(event) => {
              updateFilter({ minAmount: event.target.value });
            }}
            placeholder="Min amount"
            type="number"
            value={filters.minAmount}
          />
          <input
            className="pf-input"
            min={0}
            onChange={(event) => {
              updateFilter({ maxAmount: event.target.value });
            }}
            placeholder="Max amount"
            type="number"
            value={filters.maxAmount}
          />
          <button
            className="pf-btn-ghost h-12"
            onClick={() => {
              setFilters(defaultFilters);
            }}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </PageCard>

      <section className="mt-6">
        {transactionsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : transactions.length ? (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <TransactionRow
                expanded={expandedId === transaction.id}
                key={transaction.id}
                onToggle={() => {
                  setExpandedId((current) => (current === transaction.id ? null : transaction.id));
                }}
                transaction={transaction}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Try adjusting your search or filter criteria."
            title="No transactions match these filters"
          />
        )}

        {pagination ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                className="pf-btn-ghost h-10 px-4 disabled:opacity-50"
                disabled={!pagination.hasPreviousPage}
                onClick={() => {
                  updateFilter({ page: Math.max(1, (filters.page ?? 1) - 1) });
                }}
                type="button"
              >
                Previous
              </button>
              <button
                className="pf-btn-ghost h-10 px-4 disabled:opacity-50"
                disabled={!pagination.hasNextPage}
                onClick={() => {
                  updateFilter({ page: (filters.page ?? 1) + 1 });
                }}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
};
