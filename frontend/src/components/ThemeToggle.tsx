import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggle = ({ className = '', compact = false }: ThemeToggleProps) => {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`group relative grid place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:border-payflow-teal/40 hover:text-payflow-teal dark:border-payflow-dark-border dark:bg-payflow-ink dark:text-slate-300 dark:hover:border-payflow-mint/30 dark:hover:text-payflow-mint ${compact ? 'h-10 w-10' : 'h-[46px] w-[46px]'} ${className}`}
      onClick={toggleTheme}
      type="button"
    >
      <Sun
        className={`absolute transition-all duration-300 ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0'}`}
        size={compact ? 18 : 20}
      />
      <Moon
        className={`absolute transition-all duration-300 ${isDark ? 'scale-50 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`}
        size={compact ? 18 : 20}
      />
    </button>
  );
};
