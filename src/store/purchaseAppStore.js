import { create } from "zustand";
import {
    createPurchase,
    getPurchaseById,
    getPurchases,
    updatePurchase,
} from "../api/purchaseApi";

export const usePurchaseStore = create((set) => ({
    purchases: [],
    selectedPurchase: null,
    loading: false,
    error: null,

    fetchPurchases: async () => {
        set({
            loading: true,
            error: null,
        });

        try {
            const purchases = await getPurchases();

            set({
                purchases,
                loading: false,
            });

            return purchases;
        } catch (error) {
            set({
                loading: false,
                error: "Unable to load purchases",
            });

            throw error;
        }
    },

    fetchPurchaseById: async (id) => {
        set({
            loading: true,
            error: null,
        });

        try {
            const purchase = await getPurchaseById(id);

            set({
                selectedPurchase: purchase,
                loading: false,
            });

            return purchase;
        } catch (error) {
            set({
                loading: false,
                error: "Unable to load purchase",
            });

            throw error;
        }
    },

    savePurchase: async ({
                             id,
                             voucherData,
                             attachments,
                         }) => {
        set({
            loading: true,
            error: null,
        });

        try {
            const savedPurchase = id
                ? await updatePurchase({
                    id,
                    voucherData,
                    attachments,
                })
                : await createPurchase({
                    voucherData,
                    attachments,
                });

            set((state) => {
                const exists = state.purchases.some(
                    (purchase) => purchase.id === savedPurchase.id
                );

                return {
                    purchases: exists
                        ? state.purchases.map((purchase) =>
                            purchase.id === savedPurchase.id
                                ? savedPurchase
                                : purchase
                        )
                        : [savedPurchase, ...state.purchases],

                    selectedPurchase: savedPurchase,
                    loading: false,
                };
            });

            return savedPurchase;
        } catch (error) {
            set({
                loading: false,
                error: "Unable to save purchase",
            });

            throw error;
        }
    },

    clearSelectedPurchase: () => {
        set({
            selectedPurchase: null,
        });
    },

    clearPurchaseState: () => {
        set({
            purchases: [],
            selectedPurchase: null,
            loading: false,
            error: null,
        });
    },
}));