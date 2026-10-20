import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: 'ADMIN' | 'SUPERVISOR' | 'RECEPTIONIST' | 'THERAPIST' | 'PATIENT';
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLocked: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  lock: () => void;
  unlock: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setIsLoading(false); return; }
    try {
      const { data } = await api.get('/auth/profile');
      setUser(data);
    } catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsLocked(false);
    window.location.href = '/sama';
  };

  const lock = () => setIsLocked(true);

  const unlock = async (password: string) => {
    await api.post('/auth/verify-password', { password });
    setIsLocked(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isLocked, login, logout, lock, unlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
