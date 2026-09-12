import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useLanguage } from './LanguageContext';

interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleMode: () => void;
  primaryColor: string;
  setPrimaryColor: (c: string) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { dir } = useLanguage();
  const [mode, setMode] = useState<'light' | 'dark'>(
    (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light'
  );
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem('primaryColor') || '#1976d2'
  );

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem('themeMode', next);
  };

  const handleSetPrimaryColor = (c: string) => {
    setPrimaryColor(c);
    localStorage.setItem('primaryColor', c);
  };

  const theme = useMemo(() => createTheme({
    direction: dir,
    palette: {
      mode,
      primary: { main: primaryColor },
      secondary: { main: '#7c4dff' },
      ...(mode === 'dark' ? {
        background: { default: '#121212', paper: '#1e1e1e' },
      } : {
        background: { default: '#f5f5f5', paper: '#ffffff' },
      }),
    },
    typography: {
      fontFamily: dir === 'rtl' ? '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif' : '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  }), [mode, primaryColor, dir]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, primaryColor, setPrimaryColor: handleSetPrimaryColor }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return ctx;
}
