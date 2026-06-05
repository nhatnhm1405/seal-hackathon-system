import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/app/providers/AuthProvider";
import { C, GradientText } from "@/shared/components/PixelComponents";

interface RoleConfig {
  label: string;
  description: string;
  path: string;
  accentColor: string;
}

const ROLE_CONFIG: Record<string, RoleConfig> = {
  // Actual backend role names (Role.roleName values from DB)
  JUDGE: {
    label: "Judge",
    description: "Score team submissions",
    path: "/dashboard/judge",
    accentColor: "#3b82f6",
  },
  MENTOR: {
    label: "Mentor",
    description: "Guide and advise teams",
    path: "/dashboard/mentor",
    accentColor: "#06b6d4",
  },
  EVENT_COORDINATOR: {
    label: "Coordinator",
    description: "Manage hackathon events",
    path: "/dashboard/coordinator",
    accentColor: "#eab308",
  },
  // Aliases kept for backward compatibility
  COORDINATOR: {
    label: "Coordinator",
    description: "Manage hackathon events",
    path: "/dashboard/coordinator",
    accentColor: "#eab308",
  },
  JUDGE_INTERNAL: {
    label: "Judge",
    description: "Score team submissions",
    path: "/dashboard/judge",
    accentColor: "#3b82f6",
  },
};

function getRoleConfig(role: string): RoleConfig {
  const exact = ROLE_CONFIG[role];
  if (exact) return exact;
  // Fallback for partial matches (e.g. EVENT_COORDINATOR)
  const upper = role.toUpperCase();
  if (upper.includes("COORDINATOR")) return ROLE_CONFIG["COORDINATOR"];
  if (upper.includes("JUDGE"))       return ROLE_CONFIG["JUDGE_INTERNAL"];
  if (upper.includes("MENTOR"))      return ROLE_CONFIG["MENTOR"];
  return { label: role, description: "", path: "/dashboard", accentColor: C.green };
}

export function RoleSelector() {
  const navigate = useNavigate();
  const { availableRoles, setActiveRole } = useAuth();

  // Single role — skip selector and redirect immediately
  useEffect(() => {
    if (availableRoles.length === 1) {
      const cfg = getRoleConfig(availableRoles[0]);
      setActiveRole(availableRoles[0]);
      navigate(cfg.path, { replace: true });
    }
  }, [availableRoles, navigate, setActiveRole]);

  if (availableRoles.length === 0 || availableRoles.length === 1) return null;

  function handleSelect(role: string) {
    const cfg = getRoleConfig(role);
    setActiveRole(role);
    navigate(cfg.path);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 900,
            fontSize: 28,
            lineHeight: 1.1,
            marginBottom: 12,
          }}>
            <GradientText>Select Role</GradientText>
          </h1>
          <p style={{
            color: C.textMuted,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            lineHeight: 1.7,
          }}>
            You have multiple roles in this event.<br />
            Select the role you want to use for this session.
          </p>
        </div>

        {/* Role cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {availableRoles.map((role) => {
            const cfg = getRoleConfig(role);
            return (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                style={{
                  width: "100%",
                  background: "rgba(34,197,94,0.03)",
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${cfg.accentColor}`,
                  padding: "20px 24px",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = `rgba(34,197,94,0.07)`;
                  el.style.borderColor = cfg.accentColor;
                  el.style.boxShadow = `0 0 20px rgba(34,197,94,0.1)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "rgba(34,197,94,0.03)";
                  el.style.borderColor = C.border;
                  el.style.boxShadow = "none";
                }}
              >
                <div>
                  <div style={{
                    color: cfg.accentColor,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    marginBottom: 4,
                  }}>
                    {cfg.label}
                  </div>
                  {cfg.description && (
                    <div style={{
                      color: C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: "0.02em",
                    }}>
                      {cfg.description}
                    </div>
                  )}
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke={C.textMuted}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="6,3 11,8 6,13" />
                </svg>
              </button>
            );
          })}
        </div>

        <p style={{
          marginTop: 24,
          textAlign: "center",
          color: C.textDim,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.06em",
        }}>
          You can switch roles at any time from the sidebar
        </p>
      </div>
    </div>
  );
}
