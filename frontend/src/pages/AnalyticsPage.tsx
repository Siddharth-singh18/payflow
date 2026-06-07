import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getAnalytics } from '../api/analytics';
import { AppLayout } from '../components/AppLayout';
import { Skeleton } from '../components/Skeleton';
import { PageCard } from '../components/ui/PageCard';
import { useThemeStore } from '../store/themeStore';
import { formatMoney } from '../utils/format';

const chartColors = ['#0f766e', '#84cc16', '#f97316', '#2563eb', '#9333ea', '#dc2626'];

const formatMonth = (month: string): string => {
  const [year, monthIndex] = month.split('-');
  const date = new Date(Number(year), Number(monthIndex) - 1, 1);
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date);
};

export const AnalyticsPage = () => {
  const isDark = useThemeStore((state) => state.theme) === 'dark';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics
  });
  const analytics = analyticsQuery.data;
  const monthlyBars =
    analytics?.monthlySpendingByCategory.map((item) => ({
      ...item,
      label: formatMonth(item.month),
      categoryLabel: item.category.replaceAll('_', ' ')
    })) ?? [];
  const categoryTotals =
    analytics?.monthlySpendingByCategory.reduce<Array<{ name: string; value: number }>>(
      (totals, item) => {
        const existing = totals.find((entry) => entry.name === item.category);

        if (existing) {
          existing.value += item.amount;
          return totals;
        }

        return [...totals, { name: item.category, value: item.amount }];
      },
      []
    ) ?? [];
  const largestTransaction = Math.max(
    0,
    ...(analytics?.dailyTransactionVolume.map((item) => item.amount) ?? [])
  );

  return (
    <AppLayout
      subtitle="Spending mix, volume trends, and contacts ranked by transfer activity."
      title="Analytics"
    >
      {analyticsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Sent this month" value={formatMoney(analytics?.sentVsReceivedThisMonth.totalSent ?? 0)} />
          <StatCard
            label="Received this month"
            value={formatMoney(analytics?.sentVsReceivedThisMonth.totalReceived ?? 0)}
          />
          <StatCard
            label="Average transaction"
            value={formatMoney(analytics?.averageTransactionAmount.averageAmount ?? 0)}
          />
          <StatCard label="Largest daily volume" value={formatMoney(largestTransaction)} />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel title="Monthly spending by category">
          <ResponsiveContainer height={320} width="100%">
            <BarChart data={monthlyBars}>
              <XAxis dataKey="label" stroke={tickColor} tick={{ fill: tickColor }} tickLine={false} />
              <YAxis
                stroke={tickColor}
                tick={{ fill: tickColor }}
                tickFormatter={(value) => `₹${String(Number(value) / 1000)}k`}
              />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Bar dataKey="amount" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Category split">
          <ResponsiveContainer height={320} width="100%">
            <PieChart>
              <Pie
                data={categoryTotals}
                dataKey="value"
                innerRadius={70}
                nameKey="name"
                outerRadius={110}
                paddingAngle={3}
              >
                {categoryTotals.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <ChartPanel title="Daily transaction volume">
          <ResponsiveContainer height={300} width="100%">
            <AreaChart data={analytics?.dailyTransactionVolume ?? []}>
              <XAxis dataKey="date" stroke={tickColor} tick={{ fill: tickColor }} tickLine={false} />
              <YAxis
                stroke={tickColor}
                tick={{ fill: tickColor }}
                tickFormatter={(value) => `₹${String(Number(value) / 1000)}k`}
              />
              <Tooltip formatter={(value) => formatMoney(Number(value))} />
              <Area
                dataKey="amount"
                fill={isDark ? '#0f4c47' : '#ccfbf1'}
                stroke="#0f766e"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <PageCard>
          <h2 className="text-base font-bold">Top contacts</h2>
          <div className="mt-5 space-y-3">
            {analytics?.topContacts.length ? (
              analytics.topContacts.map((contact, index) => (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-payflow-dark-bg/50" key={contact.userId}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-payflow-teal text-sm font-semibold text-white shadow-sm dark:bg-[#004a50] dark:text-payflow-mint">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{contact.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{contact.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{contact.transferCount}x</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(contact.totalAmount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No contact activity yet.
              </p>
            )}
          </div>
        </PageCard>
      </div>
    </AppLayout>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <article className="pf-card p-6">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-bold tracking-normal">{value}</p>
  </article>
);

const ChartPanel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <PageCard>
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="mt-5">{children}</div>
  </PageCard>
);
