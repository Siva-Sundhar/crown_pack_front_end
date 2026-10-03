import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const initialState = {
  token: null,
  email: null,
  currency: null,
  currencySymbol: null,
  ledgerName: null,
  role: null,
  taxMode: null,
  taxType: null,

  customers: [],
  items: [],
  purchases: [],

  loading: false,
  error: null,
};

export const useAppStore = create(
  persist(
    (set) => ({
      ...initialState,

      login: (
        token,
        email,
        currency,
        currencySymbol,
        ledgerName,
        role,
        taxMode,
        taxType,
      ) => {
        set({
          token,
          email,
          currency,
          currencySymbol,
          ledgerName,
          role,
          taxMode,
          taxType,

          error: null,
        });
      },

      logout: () => {
        set({
          ...initialState,
        });
      },

      setCustomers: (customers) => {
        set({ customers });
      },

      setItems: (items) => {
        set({ items });
      },

      setPurchases: (purchases) => {
        set({ purchases });
      },

      setLoading: (loading) => {
        set({ loading });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: "app-auth-storage",

      // Use sessionStorage instead of localStorage
      storage: createJSONStorage(() => sessionStorage),

      // Store only authentication information
      partialize: (state) => ({
        token: state.token,
        email: state.email,

        currency: state.currency,
        currencySymbol: state.currencySymbol,
        ledgerName: state.ledgerName,
        role: state.role,
        taxMode: state.taxMode,
        taxType: state.taxType,

        
      }),
    },
  ),
);
