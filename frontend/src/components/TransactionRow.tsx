import { ArrowDownLeft, ArrowUpRight, ChevronDown, ShieldAlert } from 'lucide-react';
import type { TransactionItem } from '../types/transaction';
import { formatMoney } from '../utils/format';

interface TransactionRowProps {
  transaction: TransactionItem;
  expanded?: boolean;
  onToggle?: () => void;
}

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export const TransactionRow = ({
  transaction,
  expanded = false,
  onToggle
}: TransactionRowProps) => {
  const isCredit = transaction.type === 'credit';
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  const amountClass = isCredit ? 'text-emerald-600' : 'text-red-600';
  const counterparty = transaction.counterparty?.name ?? transaction.description;

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm transition hover:border-payflow-teal/40 hover:shadow-md dark:border-payflow-dark-border dark:bg-payflow-dark-elevated dark:hover:border-payflow-teal/50">
      <button
        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <span
          className={`grid h-11 w-11 place-items-center rounded-lg ${
            isCredit
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
              : 'bg-red-50 text-red-600 dark:bg-red-950/40'
          }`}
        >
          <Icon size={20} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{counterparty}</span>
            {transaction.isFlagged || transaction.status === 'flagged' ? (
              <ShieldAlert className="shrink-0 text-amber-500" size={16} />
            ) : null}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
            {dateFormat.format(new Date(transaction.createdAt))} · {transaction.channel}
          </span>
        </span>
        <span className="text-right">
          <span className={`block text-sm font-semibold ${amountClass}`}>
            {isCredit ? '+' : '-'}
            {formatMoney(transaction.amount)}
          </span>
          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {transaction.status}
          </span>
        </span>
        <ChevronDown
          className={`hidden text-slate-400 transition sm:block ${expanded ? 'rotate-180' : ''}`}
          size={18}
        />
      </button>

      {expanded ? (
        <div className="grid gap-3 border-t border-slate-200/80 px-4 py-4 text-sm dark:border-payflow-dark-border sm:grid-cols-2">
          <p>
            <span className="block text-xs text-slate-500">Reference</span>
            <span className="font-medium">{transaction.referenceId}</span>
          </p>
          <p>
            <span className="block text-xs text-slate-500">Balance after</span>
            <span className="font-medium">{formatMoney(transaction.balanceAfter)}</span>
          </p>
          <p>
            <span className="block text-xs text-slate-500">Category</span>
            <span className="font-medium capitalize">{transaction.category.replaceAll('_', ' ')}</span>
          </p>
          <p>
            <span className="block text-xs text-slate-500">Fraud score</span>
            <span className="font-medium">{transaction.fraudScore}/100</span>
          </p>
          {transaction.note ? (
            <p className="sm:col-span-2">
              <span className="block text-xs text-slate-500">Note</span>
              <span className="font-medium">{transaction.note}</span>
            </p>
          ) : null}
          {transaction.fraudReasons.length > 0 ? (
            <p className="sm:col-span-2">
              <span className="block text-xs text-slate-500">Fraud reasons</span>
              <span className="font-medium">{transaction.fraudReasons.join(', ')}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};
