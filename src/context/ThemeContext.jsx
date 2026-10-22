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
    // Keep the browser chrome (mobile address bar) in step with the theme.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f5f5' : '#0a0a0a');
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
