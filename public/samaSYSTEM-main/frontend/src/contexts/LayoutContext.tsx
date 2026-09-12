import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type LayoutMode = 'vertical' | 'horizontal' | 'semibox';
export type LayoutWidth = 'fluid' | 'boxed';
export type TopbarColor = 'light' | 'dark';
export type SidebarSize = 'default' | 'compact';
export type SidebarColor = 'light' | 'dark' | 'gradient';
export type SidebarImage = 'none' | 'img1' | 'img2' | 'img3' | 'img4';

export interface LayoutConfig {
  layout: LayoutMode;
  layoutWidth: LayoutWidth;
  topbarColor: TopbarColor;
  sidebarSize: SidebarSize;
  sidebarColor: SidebarColor;
  sidebarImage: SidebarImage;
  preloader: boolean;
  sidebarOpen: boolean;
}

interface LayoutContextType {
  config: LayoutConfig;
  updateConfig: (partial: Partial<LayoutConfig>) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

const SIDEBAR_SIZES: Record<SidebarSize, { open: number; closed: number }> = {
  default: { open: 260, closed: 64 },
  compact: { open: 200, closed: 56 },
};

export const SIDEBAR_IMAGES: { value: SidebarImage; url: string }[] = [
  { value: 'none', url: '' },
  { value: 'img1', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300' },
  { value: 'img2', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=300' },
  { value: 'img3', url: 'https://images.unsplash.com/photo-1557682260-96773eb01377?w=300' },
  { value: 'img4', url: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=300' },
];

const DEFAULT_CONFIG: LayoutConfig = {
  layout: 'vertical',
  layoutWidth: 'fluid',
  topbarColor: 'dark',
  sidebarSize: 'default',
  sidebarColor: 'dark',
  sidebarImage: 'none',
  preloader: false,
  sidebarOpen: false,
};

function loadConfig(): LayoutConfig {
  const saved = localStorage.getItem('layoutConfig');
  if (saved) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }; } catch { /* ignore */ }
  }
  return DEFAULT_CONFIG;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<LayoutConfig>(loadConfig);

  const persist = useCallback((next: LayoutConfig) => {
    setConfig(next);
    localStorage.setItem('layoutConfig', JSON.stringify(next));
  }, []);

  const updateConfig = useCallback((partial: Partial<LayoutConfig>) => {
    persist({ ...config, ...partial });
  }, [config, persist]);

  const toggleSidebar = useCallback(() => {
    persist({ ...config, sidebarOpen: !config.sidebarOpen });
  }, [config, persist]);

  const sizes = SIDEBAR_SIZES[config.sidebarSize];
  const sidebarWidth = config.sidebarOpen ? sizes.open : sizes.closed;

  return (
    <LayoutContext.Provider value={{ config, updateConfig, toggleSidebar, sidebarWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
