import { useEffect } from "react";
import api from "../api/api";
import { useAppStore } from "../store/useAppStore.js";

const Dashboard = () => {
    const setCustomers = useAppStore((state) => state.setCustomers);
    const setItems = useAppStore((state) => state.setItems);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [customersResponse, itemsResponse] =
                    await Promise.all([
                        api.get("/api/customers"),
                        api.get("/api/items"),
                    ]);

                setCustomers(customersResponse.data);
                setItems(itemsResponse.data);
            } catch (error) {
                console.error("Failed to load master data", error);
            }
        };

        loadMasterData();
    }, [setCustomers, setItems]);

    return <div>Dashboard</div>;
};

export default Dashboard;