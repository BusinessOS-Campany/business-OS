import { create } from "zustand";

export interface SessionUser {
  id: string;
  name: string;
  username: string | null;
  email: string;
  language: string;
  theme: string;
  phone: string;
  avatar: string;
  isSuperAdmin: boolean;
  companyId: string | null;
  branchId: string | null;
  terminalId: string | null;
}

export interface SessionCompany {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
}

export interface AuthBranch {
  id: string;
  name: string;
  nameAr: string;
  code: string;
}

export interface AuthCurrency {
  code: string;
  symbol: string;
  symbolAr: string;
  isBase: boolean;
}

interface AuthState {
  loaded: boolean;
  user: SessionUser | null;
  company: SessionCompany | null;
  permissions: string[];
  branches: AuthBranch[];
  currency: AuthCurrency | null;
  setSession: (data: Partial<Omit<AuthState, "setSession" | "clear">>) => void;
  clear: () => void;
}

const initial = {
  loaded: false,
  user: null,
  company: null,
  permissions: [] as string[],
  branches: [] as AuthBranch[],
  currency: null as AuthCurrency | null,
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initial,
  setSession: (data) => set({ ...data, loaded: true }),
  clear: () => set({ ...initial }),
}));