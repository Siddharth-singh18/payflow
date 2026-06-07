import type { ReactNode } from 'react';

interface PageCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
};

export const PageCard = ({ children, className = '', padding = 'md' }: PageCardProps) => (
  <section
    className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-payflow-dark-border dark:bg-payflow-ink dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] ${paddingMap[padding]} ${className}`}
  >
    {children}
  </section>
);

interface PageCardHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const PageCardHeader = ({ icon, title, description, action }: PageCardHeaderProps) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div className="flex items-center gap-3">
      {icon ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-payflow-teal shadow-inner dark:bg-teal-950/40 dark:text-payflow-mint">
          {icon}
        </span>
      ) : null}
      <div>
        <h2 className="text-base font-bold tracking-normal">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
    </div>
    {action}
  </div>
);
