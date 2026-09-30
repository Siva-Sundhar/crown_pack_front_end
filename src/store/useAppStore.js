import { create } from "zustand";
import {
  persist,
  createJSONStorage,
} from "zustand/middleware";

const initialState = {
  token: null,
  username: null,

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

      login: (token, username) => {
        set({
          token,
          username,
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
        username: state.username,
      }),
    }
  )
);