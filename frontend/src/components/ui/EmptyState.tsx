import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center dark:border-payflow-dark-border dark:bg-payflow-dark-bg/40">
    <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_30%_20%,rgba(15,118,110,0.12)_0,transparent_45%),radial-gradient(circle_at_80%_80%,rgba(132,204,22,0.08)_0,transparent_40%)]" />
    <div className="relative">
      {icon ? <div className="mx-auto mb-5 flex justify-center">{icon}</div> : null}
      <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  </div>
);
