import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { C } from "@/shared/components/PixelComponents";

interface DemoUser {
  userId: number;
  label: string;
  sublabel: string;
  color: string;
  dashPath: string;
}

const DEMO_USERS: DemoUser[] = [
  { userId: 18, label: "Participant (No Team)", sublabel: "noteam@seal.edu", color: "#f97316", dashPath: "/dashboard" },
  { userId: 2, label: "Participant (Leader)", sublabel: "leader@seal.edu", color: C.cyan, dashPath: "/dashboard" },
  { userId: 3, label: "Participant (Member)", sublabel: "member@seal.edu", color: C.blue, dashPath: "/dashboard" },
  { userId: 4, label: "Mentor", sublabel: "mentor@seal.edu", color: "#a855f7", dashPath: "/dashboard" },
  { userId: 5, label: "Judge", sublabel: "judge@seal.edu", color: "#f59e0b", dashPath: "/dashboard" },
  { userId: 1, label: "Coordinator", sublabel: "coordinator@seal.edu", color: C.green, dashPath: "/coordinator/dashboard" },
];

export function DevToolbar() {
  const [open, setOpen] = useState(false);
  const { switchUser, currentUser } = useAuth();
  const navigate = useNavigate();

  function handleSwitch(demo: DemoUser) {
    switchUser(demo.userId);
    navigate(demo.dashPath);
    setOpen(false);
  }

  const activeDemoUser = DEMO_USERS.find(d => d.userId === currentUser?.user_id);

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 8,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {open && (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          boxShadow: `0 0 24px rgba(34,197,94,0.12), 0 8px 32px rgba(0,0,0,0.6)`,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 240,
        }}>
          {DEMO_USERS.map((demo) => {
            const isActive = currentUser?.user_id === demo.userId;
            return (
              <button
                key={demo.userId}
                onClick={() => handleSwitch(demo)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  padding: "8px 10px",
                  background: isActive ? "rgba(34,197,94,0.08)" : "transparent",
                  border: isActive ? `1px solid rgba(34,197,94,0.3)` : `1px solid transparent`,
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 0,
                  transition: "all 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span style={{ color: isActive ? C.green : demo.color, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em" }}>
                  {isActive ? "● " : "  "}{demo.label}
                </span>
                <span style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.06em" }}>{demo.sublabel}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: open ? "rgba(34,197,94,0.15)" : C.surface,
          border: `1px solid ${open ? C.green : C.border}`,
          cursor: "pointer",
          borderRadius: 0,
          boxShadow: open ? `0 0 12px rgba(34,197,94,0.25)` : "0 4px 16px rgba(0,0,0,0.5)",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{
          background: C.green,
          color: C.bg,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.1em",
          padding: "2px 5px",
        }}>
          DEMO
        </span>
        {activeDemoUser && (
          <span style={{ color: activeDemoUser.color, fontSize: 11, letterSpacing: "0.06em" }}>
            {activeDemoUser.label}
          </span>
        )}
        {!activeDemoUser && (
          <span style={{ color: C.textMuted, fontSize: 11, letterSpacing: "0.06em" }}>
            Switch Role
          </span>
        )}
      </button>
    </div>
  );
}
