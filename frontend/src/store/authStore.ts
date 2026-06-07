import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, TokenPair } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  tokens: TokenPair | null;
  pendingVerificationEmail: string | null;
  setSession: (user: AuthUser, tokens: TokenPair) => void;
  setTokens: (tokens: TokenPair) => void;
  setPendingVerificationEmail: (email: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      pendingVerificationEmail: null,
      setSession: (user, tokens) => {
        set({ user, tokens });
      },
      setTokens: (tokens) => {
        set({ tokens });
      },
      setPendingVerificationEmail: (email) => {
        set({ pendingVerificationEmail: email });
      },
      clearSession: () => {
        set({ user: null, tokens: null });
      }
    }),
    {
      name: 'payflow-auth'
    }
  )
);
