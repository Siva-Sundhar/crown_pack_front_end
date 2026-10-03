// import SimpleLogin from './auth/LoginPage';
// import PurchaseSample from './components/PurchaseSample';
import Purchase from "./components/Purchase";
import LoginPage from "./auth/LoginPage.jsx";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard.jsx";
import PublicRoute from "./routes/PublicRoute.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AlterPurchase from "./components/AlterPurchase.jsx";
// import Purchase from "./sample/Purchase.jsx";
// import {Purchase} from './sample/Purchase';

// import Purchase from "./sample/Purchase";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicRoute />}>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected Route */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/purchase" element={<AlterPurchase />} />
          <Route
            path="/purchase/alter/:id"
            element={<AlterPurchase />}
          />
        </Route>
        {/* Unknown routes */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
export default App;
