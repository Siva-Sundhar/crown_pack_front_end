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
    return await api.post(
        "/api/auth/authorization/otpverify",
        null, {
            params: {
                email,
                code: otp,
            }

        }
    );
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