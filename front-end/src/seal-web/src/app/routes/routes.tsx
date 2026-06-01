import { createBrowserRouter, useNavigate } from "react-router";
import { LandingPage } from "@/features/landing/LandingPage";

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
    { path: "*", element: <LandingPageWrapper /> },
]);