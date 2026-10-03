import {Navigate, Outlet, useLocation} from "react-router-dom";
import {useAppStore} from "../store/useAppStore.js";

const ProtectedRoute = () => {
    const location = useLocation();
    const token = useAppStore((state)=> state.token);

    if (!token) {
        return (
            <Navigate to='/login' replace state={{from: location.pathname}} />
        )
    }

    return <Outlet />
}

export default ProtectedRoute;