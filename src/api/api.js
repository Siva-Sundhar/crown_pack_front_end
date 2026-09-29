import axios from "axios";
import {useAppStore} from "../store/useAppStore.js";

const api = axios.create({
    baseURL: "http://localhost:8080",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = useAppStore.getState().token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem("user_token");
            sessionStorage.removeItem("po_username");
        }

        return Promise.reject(error);
    }
);

export default api;