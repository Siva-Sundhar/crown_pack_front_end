import api from "./api";

export const loginWithPassword = async (email, password) => {
    const response = await api.post(
        "/api/auth/authentication/login",
        {
            email,
            password,
        }
    );

    return response.data;
};

export const verifyOtp = async (email, otp) => {
    const response = await api.post(
        "/api/auth/authentication/verify-otp",
        {
            email,
            otp,
        }
    );

    return response.data;
};

export const resendOtp = async (email) => {
    const response = await api.post(
        "/api/auth/authentication/resend-otp",
        {
            email,
        }
    );

    return response.data;
};