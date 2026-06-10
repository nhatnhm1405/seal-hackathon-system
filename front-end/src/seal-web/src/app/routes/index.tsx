import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { DevToolbar } from "@/shared/components/DevToolbar";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { PendingApprovalPage } from "@/features/auth/PendingApprovalPage";
import { RoleSelector } from "@/features/auth/RoleSelector";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPage";
import { JudgeDashboard } from "@/features/dashboard/dashboards/JudgeDashboard";
import { MentorDashboard } from "@/features/dashboard/dashboards/MentorDashboard";
import { CoordinatorDashboard } from "@/features/dashboard/dashboards/CoordinatorDashboard";
import { LeaderboardPage } from "@/features/scoring/LeaderboardPage";
import { ProfilePage } from "@/features/users/ProfilePage";
import { TeamCreatePage } from "@/features/teams/TeamCreatePage";
import { TeamManagePage } from "@/features/teams/TeamManagePage";
import { TeamSubmitPage } from "@/features/submissions/TeamSubmitPage";
import { TeamViewPage } from "@/features/teams/TeamViewPage";
import { MentorTracksPage } from "@/features/tracks/MentorTracksPage";
import { JudgeScoringPage } from "@/features/scoring/JudgeScoringPage";
import { JudgeHistoryPage } from "@/features/scoring/JudgeHistoryPage";
import { CoordEventsPage } from "@/features/events/CoordEventsPage";
import { CoordAccountsPage } from "@/features/users/CoordAccountsPage";
import { CoordTeamsPage } from "@/features/teams/CoordTeamsPage";
import { CoordJudgesPage } from "@/features/scoring/CoordJudgesPage";
import { CoordScoringPage } from "@/features/scoring/CoordScoringPage";
import { CoordPrizesPage } from "@/features/events/CoordPrizesPage";
import { CoordAuditPage } from "@/features/users/CoordAuditPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { AboutPage } from "@/features/landing/AboutPage";
import { TeamPage } from "@/features/landing/TeamPage";
import { ContactPage } from "@/features/landing/ContactPage";

function RequireAuth({
  allowedRoles,
}: {
  allowedRoles?: string[];
}) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for session restore before deciding to redirect
  if (isLoading) return null;

  if (!isAuthenticated)
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  if (
    allowedRoles &&
    currentUser &&
    !allowedRoles.includes(currentUser.role)
  ) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// Guards staff-only routes: if a multi-role user hasn't selected yet, send to /select-role
function RoleGate() {
  const { availableRoles, activeRole } = useAuth();
  if (availableRoles.length > 1 && activeRole === null) {
    return <Navigate to="/select-role" replace />;
  }
  return <Outlet />;
}

function DashboardWrapper() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

function RootLayout() {
  return (
    <>
      <Outlet />
      <DevToolbar />
    </>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();
  return (
    <LandingPage
      navigate={(page) => {
        if (page === "auth") navigate("/login");
        else if (page === "register") navigate("/register");
        else if (page === "dashboard") navigate("/dashboard");
      }}
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", Component: LandingPageWrapper },
      { path: "/about", Component: AboutPage },
      { path: "/team", Component: TeamPage },
      { path: "/contact", Component: ContactPage },
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: RegisterPage },
      {
        path: "/pending-approval",
        Component: PendingApprovalPage,
      },
      {
        path: "/forgot-password",
        Component: ForgotPasswordPage,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardWrapper />,
            children: [
              // Role selector — accessible to any authenticated user
              {
                path: "/select-role",
                Component: RoleSelector,
              },
              // Shared routes (all authenticated roles)
              {
                path: "/dashboard",
                Component: RoleDashboardPage,
              },
              {
                path: "/leaderboard",
                Component: LeaderboardPage,
              },
              { path: "/profile", Component: ProfilePage },
              // Participant routes — is_leader check happens inside each page
              {
                element: (
                  <RequireAuth allowedRoles={["PARTICIPANT"]} />
                ),
                children: [
                  {
                    path: "/team/view",
                    Component: TeamViewPage,
                  },
                  {
                    path: "/team/create",
                    Component: TeamCreatePage,
                  },
                  {
                    path: "/team/manage",
                    Component: TeamManagePage,
                  },
                  {
                    path: "/team/submit",
                    Component: TeamSubmitPage,
                  },
                ],
              },
              // Staff routes — guarded by RoleGate (requires activeRole to be set)
              {
                element: <RoleGate />,
                children: [
                  // Role-specific dashboard entry points (from RoleSelector)
                  {
                    path: "/dashboard/judge",
                    element: <JudgeDashboard />,
                  },
                  {
                    path: "/dashboard/mentor",
                    element: <MentorDashboard />,
                  },
                  {
                    path: "/dashboard/coordinator",
                    element: <CoordinatorDashboard />,
                  },
                  {
                    element: (
                      <RequireAuth allowedRoles={["MENTOR"]} />
                    ),
                    children: [
                      {
                        path: "/mentor/tracks",
                        Component: MentorTracksPage,
                      },
                    ],
                  },
                  {
                    element: (
                      <RequireAuth allowedRoles={["JUDGE"]} />
                    ),
                    children: [
                      {
                        path: "/judge/score",
                        Component: JudgeScoringPage,
                      },
                      {
                        path: "/judge/history",
                        Component: JudgeHistoryPage,
                      },
                    ],
                  },
                  {
                    element: (
                      <RequireAuth allowedRoles={["COORDINATOR"]} />
                    ),
                    children: [
                      {
                        path: "/coordinator/dashboard",
                        Component: RoleDashboardPage,
                      },
                      {
                        path: "/coordinator/events",
                        Component: CoordEventsPage,
                      },
                      {
                        path: "/coordinator/accounts",
                        Component: CoordAccountsPage,
                      },
                      {
                        path: "/coordinator/teams",
                        Component: CoordTeamsPage,
                      },
                      {
                        path: "/coordinator/judges",
                        Component: CoordJudgesPage,
                      },
                      {
                        path: "/coordinator/scoring",
                        Component: CoordScoringPage,
                      },
                      {
                        path: "/coordinator/prizes",
                        Component: CoordPrizesPage,
                      },
                      {
                        path: "/coordinator/audit",
                        Component: CoordAuditPage,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
