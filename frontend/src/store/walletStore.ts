import { create } from 'zustand';
import type { WalletBalance } from '../types/wallet';

interface WalletState {
  wallet: WalletBalance | null;
  setWallet: (wallet: WalletBalance | null) => void;
  applyBalance: (balance: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  setWallet: (wallet) => {
    set({ wallet });
  },
  applyBalance: (balance) => {
    set((state) => ({
      wallet: state.wallet
        ? {
            ...state.wallet,
            balance,
            balancePaise: Math.round(balance * 100)
          }
        : null
    }));
  }
}));
