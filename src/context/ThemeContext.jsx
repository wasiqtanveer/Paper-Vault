import { useEffect, useState } from 'react';
import { ThemeContext } from './theme-context';
import { readStorage, writeStorage } from '../lib/safeStorage';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return readStorage('pv-theme', 'dark');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    writeStorage('pv-theme', theme);
  }, [theme]);

  function toggle() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
