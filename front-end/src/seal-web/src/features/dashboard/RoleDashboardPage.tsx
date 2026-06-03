import { useAuth } from "@/app/providers/AuthProvider";
import { ParticipantDashboard } from "./dashboards/ParticipantDashboard";
import { MentorDashboard } from "./dashboards/MentorDashboard";
import { JudgeDashboard } from "./dashboards/JudgeDashboard";
import { CoordinatorDashboard } from "./dashboards/CoordinatorDashboard";

export function RoleDashboardPage() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  switch (currentUser.role) {
    case 'PARTICIPANT': return <ParticipantDashboard />;
    case 'MENTOR': return <MentorDashboard />;
    case 'JUDGE': return <JudgeDashboard />;
    case 'COORDINATOR': return <CoordinatorDashboard />;
    default: return null;
  }
}
