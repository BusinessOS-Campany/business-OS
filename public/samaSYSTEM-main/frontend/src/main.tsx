import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function RTLProvider({ children }: { children: React.ReactNode }) {
  const { dir } = useLanguage();
  const cache = useMemo(() => createCache({
    key: dir === 'rtl' ? 'muirtl' : 'mui',
    stylisPlugins: dir === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
  }), [dir]);
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/sama">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <RTLProvider>
              <ThemeProvider>
                <LayoutProvider>
                  <App />
                </LayoutProvider>
              </ThemeProvider>
            </RTLProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
