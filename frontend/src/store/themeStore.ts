import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

const applyThemeClass = (theme: ThemeMode): void => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  document.documentElement.style.colorScheme = theme;
};

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(next);
      }
    }),
    {
      name: 'payflow-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeClass(state.theme);
        }
      }
    }
  )
);

export const initThemeFromStorage = (): ThemeMode => {
  try {
    const raw = localStorage.getItem('payflow-theme');
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: ThemeMode } };
      const theme = parsed.state?.theme;
      if (theme === 'light' || theme === 'dark') {
        applyThemeClass(theme);
        return theme;
      }
    }
  } catch {
    /* ignore */
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme: ThemeMode = prefersDark ? 'dark' : 'light';
  applyThemeClass(theme);
  return theme;
};
