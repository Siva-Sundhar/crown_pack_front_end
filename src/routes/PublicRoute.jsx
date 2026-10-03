import {useAppStore} from "../store/useAppStore.js";
import {Navigate, Outlet, useLocation} from "react-router-dom";

const PublicRoute = () => {

    const token = useAppStore((state) => state.token);
    const location = useLocation();


    if(token) {
        return <Navigate to='/dashboard' state={{ from: location }} replace />;
    }
    return <Outlet />;
}

export default PublicRoute;