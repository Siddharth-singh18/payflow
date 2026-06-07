import { motion } from 'framer-motion';
import { ShieldCheck, Smartphone, Sparkles, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export const AuthShell = ({ children, eyebrow, title, subtitle }: AuthShellProps) => {
  return (
    <main className="pf-page">
      <section className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative hidden overflow-hidden bg-auth-panel px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_18%,#ffffff_0,transparent_30%),radial-gradient(circle_at_72%_28%,#84cc16_0,transparent_24%),radial-gradient(circle_at_42%_82%,#f97316_0,transparent_22%)]" />
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-white/10 bg-white/5" />
          <div className="absolute bottom-10 left-8 h-40 w-40 rounded-full border border-white/10 bg-white/5" />

          <div className="relative">
            <div className="flex items-center gap-3 text-lg font-bold">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-payflow-teal shadow-lg">
                <WalletCards size={24} />
              </span>
              PayFlow
            </div>
            <div className="mt-24 max-w-lg">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50">
                <Sparkles size={14} />
                Secure Wallet
              </p>
              <h1 className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight">
                Move money with bank-grade checks in the flow.
              </h1>
              <p className="mt-5 text-base leading-7 text-emerald-50/90">
                Fast onboarding, OTP verification, encrypted sessions, and transaction controls
                ready for real payment workflows.
              </p>
            </div>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <ShieldCheck size={22} />
              <p className="mt-4 text-sm font-medium text-emerald-50">JWT session protection</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <Smartphone size={22} />
              <p className="mt-4 text-sm font-medium text-emerald-50">OTP verified access</p>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
            <ThemeToggle />
          </div>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-payflow-dark-border dark:bg-payflow-ink dark:shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-payflow-teal dark:text-payflow-mint">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>
          </motion.div>
        </section>
      </section>
    </main>
  );
};
