import { createBrowserRouter, Navigate, useNavigate } from "react-router";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { PendingApprovalPage } from "@/features/auth/PendingApprovalPage";
import { CoordinatorDashboard } from "@/features/dashboard/dashboards/CoordinatorDashboard";

function LandingPageWrapper() {
    const navigate = useNavigate();
    return (
        <LandingPage
            navigate={(page) => {
                if (page === 'auth') navigate('/login');
                else if (page === 'dashboard') navigate('/dashboard');
            }}
        />
    );
}

export const router = createBrowserRouter([
    { path: "/", Component: LandingPageWrapper },
    { path: "/login", Component: LoginPage },
    { path: "/register", Component: RegisterPage },
    { path: "/pending-approval", Component: PendingApprovalPage },
    { path: "/coordinator/dashboard", Component: CoordinatorDashboard },
    { path: "*", element: <Navigate to="/" replace /> },
]);