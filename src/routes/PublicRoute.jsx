import {useAppStore} from "../store/useAppStore.js";
import {Navigate, Outlet} from "react-router-dom";

const PublicRoute = () => {

    const token = useAppStore((state) => state.token);

    if(token) {
        return <Navigate to='/dashboard' replace />;
    }
    return <Outlet />;
}

export default PublicRoute;