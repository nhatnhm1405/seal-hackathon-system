import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { DevToolbar } from "@/shared/components/DevToolbar";
import { LandingPage } from "@/features/landing/LandingPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { PendingApprovalPage } from "@/features/auth/PendingApprovalPage";
import { DashboardLayout } from "@/app/layouts/DashboardLayout";
import { RoleDashboardPage } from "@/features/dashboard/RoleDashboardPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
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

function RequireAuth({ allowedRoles }: { allowedRoles?: string[] }) {
  const { currentUser, isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();
  if (isAuthLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
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
        if (page === 'auth') navigate('/login');
        else if (page === 'dashboard') navigate('/dashboard');
      }}
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  { path: "/", Component: LandingPageWrapper },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/pending-approval", Component: PendingApprovalPage },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardWrapper />,
        children: [
          { path: "/dashboard", Component: RoleDashboardPage },
          { path: "/leaderboard", Component: LeaderboardPage },
          { path: "/profile", Component: ProfilePage },
          // Participant routes — is_leader check happens inside each page
          {
            element: <RequireAuth allowedRoles={["PARTICIPANT"]} />,
            children: [
              { path: "/team/view", Component: TeamViewPage },
              { path: "/team/create", Component: TeamCreatePage },
              { path: "/team/manage", Component: TeamManagePage },
              { path: "/team/submit", Component: TeamSubmitPage },
            ],
          },
          {
            element: <RequireAuth allowedRoles={["MENTOR"]} />,
            children: [
              { path: "/mentor/tracks", Component: MentorTracksPage },
            ],
          },
          {
            element: <RequireAuth allowedRoles={["JUDGE"]} />,
            children: [
              { path: "/judge/score", Component: JudgeScoringPage },
              { path: "/judge/history", Component: JudgeHistoryPage },
            ],
          },
          {
            element: <RequireAuth allowedRoles={["COORDINATOR"]} />,
            children: [
              { path: "/coordinator/dashboard", Component: RoleDashboardPage },
              { path: "/coordinator/events", Component: CoordEventsPage },
              { path: "/coordinator/accounts", Component: CoordAccountsPage },
              { path: "/coordinator/teams", Component: CoordTeamsPage },
              { path: "/coordinator/judges", Component: CoordJudgesPage },
              { path: "/coordinator/scoring", Component: CoordScoringPage },
              { path: "/coordinator/prizes", Component: CoordPrizesPage },
              { path: "/coordinator/audit", Component: CoordAuditPage },
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
