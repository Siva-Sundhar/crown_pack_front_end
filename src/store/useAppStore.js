import { create } from "zustand";

const initialState = {
    token: null,
    username: null,

    customers: [],
    items: [],
    purchases: [],
    dayBooks: [],

    loading: false,
    error: null,
};

export const useAppStore = create((set) => ({
    ...initialState,

    login: (token, username) => {
        set({
            token,
            username,
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

    setDayBooks: (dayBooks) => {
        set({ dayBooks });
    },

    setLoading: (loading) => {
        set({ loading });
    },

    setError: (error) => {
        set({ error });
    },
}));