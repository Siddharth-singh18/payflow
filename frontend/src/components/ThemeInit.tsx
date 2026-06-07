import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export const ThemeInit = () => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return null;
};
