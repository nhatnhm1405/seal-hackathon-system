import { useState } from "react";
import { useForceDark } from "@/app/providers/ThemeProvider";
import { useNavigate } from "react-router";
import {
  C, GradientText, PixelButton, PixelInput, FloatingParticles, TerminalWindow,
} from "@/shared/components/PixelComponents";
import { useAuth } from "@/app/providers/AuthProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";
import { SealFooter } from "@/shared/components/SealFooter";
import { SocialAuthButtons } from "@/features/auth/SocialAuthButtons";
import sealLogo from "@/imports/image.png";

export function LoginPage() {
  useForceDark();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addAuthToast } = useNotifications();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result === 'ok' || result === 'ok:select-role') {
        addAuthToast({ type: 'success', title: 'WELCOME BACK', message: `Authenticated as ${email}` });
        navigate(result === 'ok:select-role' ? '/select-role' : '/dashboard');
      } else if (result === 'pending_approval') {
        navigate('/pending-approval');
      } else if (result === 'inactive') {
        setShowInactiveModal(true);
      } else {
        setError("Invalid credentials. Please verify your email and password.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: C.bg, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

    {/* Inactive account modal */}
    {showInactiveModal && (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
        onClick={() => setShowInactiveModal(false)}
      >
        <div
          style={{
            background: "var(--c-surface)",
            border: `1px solid rgba(239,68,68,0.5)`,
            maxWidth: 420, width: "100%",
            padding: 32,
            position: "relative",
            boxShadow: "0 0 32px rgba(239,68,68,0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowInactiveModal(false)}
            style={{
              position: "absolute", top: 12, right: 12,
              background: "none", border: "none", cursor: "pointer",
              color: C.textMuted, fontSize: 18, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ✕
          </button>

          {/* Icon */}
          <div style={{ marginBottom: 16, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52,
              border: `1px solid rgba(239,68,68,0.4)`,
              background: "rgba(239,68,68,0.08)",
              marginBottom: 16,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/>
                <line x1="8" y1="8" x2="16" y2="16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="square"/>
                <line x1="16" y1="8" x2="8" y2="16" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="square"/>
              </svg>
            </div>
          </div>

          <h2 style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 900,
            fontSize: 20, color: C.red, textAlign: "center",
            marginBottom: 12, letterSpacing: "0.06em",
          }}>
            ACCOUNT INACTIVE
          </h2>

          <div style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.25)",
            padding: "12px 16px",
            marginBottom: 20,
          }}>
            <p style={{
              color: C.red, fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: "0.06em", textAlign: "center",
              textTransform: "uppercase",
            }}>
              Access Denied — Account Deactivated
            </p>
          </div>

          <p style={{
            color: C.text, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, lineHeight: 1.8, marginBottom: 8, textAlign: "center",
          }}>
            Your account has been deactivated by a coordinator.
          </p>
          <p style={{
            color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, lineHeight: 1.7, marginBottom: 24, textAlign: "center",
          }}>
            Please contact the hackathon organizers for assistance.
          </p>

          <PixelButton variant="cyber" size="md" fullWidth onClick={() => setShowInactiveModal(false)}>
            CLOSE
          </PixelButton>
        </div>
      </div>
    )}
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }} className="cyber-grid-bg">
      <FloatingParticles count={30} />
      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.08), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex" }}>
        {/* Left panel */}
        <div className="hidden lg:flex" style={{ flex: 1, padding: 48, flexDirection: "column", justifyContent: "center", borderRight: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <div style={{ height: 100, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
              <img src={sealLogo} alt="HMS" style={{ height: 200, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.4))" }} />
            </div>
            <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: "0.08em" }}>
              <GradientText>HACKATHON Management System</GradientText>
            </span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 900, lineHeight: 1.1 }}>
              <GradientText>OPERATIONAL</GradientText>
            </h2>
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
              All systems online. Ready to authenticate hackers, judges, mentors and coordinators.
            </p>
          </div>

          <TerminalWindow title="hms-status">
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: C.text }}>
              <div><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>auth_service</span> <span style={{ color: C.green }}>ONLINE</span></div>
              <div><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>events_service</span> <span style={{ color: C.green }}>ONLINE</span></div>
              <div><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>scoring_engine</span> <span style={{ color: C.green }}>ONLINE</span></div>
              <div><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>db_cluster</span> <span style={{ color: C.green }}>5/5 NODES</span></div>
              <div style={{ marginTop: 4 }}><span style={{ color: C.blue }}>$</span> <span style={{ color: C.textMuted }}>awaiting credentials...</span></div>
            </div>
          </TerminalWindow>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
              <div style={{ height: 100, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
                <img src={sealLogo} alt="HMS" style={{ height: 200, width: "auto", objectFit: "contain" }} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 36, lineHeight: 1.1 }}>
                <GradientText>Access Terminal</GradientText>
              </h1>
              <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginTop: 10, lineHeight: 1.7 }}>
                Authenticate to enter the hackathon console.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PixelInput
                label="Email"
                placeholder="you@seal.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PixelInput
                label="Password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showToggle
              />

              {error && (
                <div style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: C.red,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: "10px 12px",
                  letterSpacing: "0.04em",
                }}>
                  ERROR: {error}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      width: 14,
                      height: 14,
                      border: `1px solid ${rememberMe ? C.green : C.border}`,
                      background: rememberMe ? "rgba(34,197,94,0.15)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "border-color 0.15s, background 0.15s",
                    }}
                  >
                    {rememberMe && (
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke={C.green} strokeWidth="1.5" strokeLinecap="square" />
                      </svg>
                    )}
                  </div>
                  <span
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      color: C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                    }}
                  >
                    REMEMBER ME
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em", padding: 0, transition: "color 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
                >
                  FORGOT PASSWORD?
                </button>
              </div>

              <PixelButton type="submit" variant="cyber" size="lg" fullWidth disabled={submitting}>
                {submitting ? "AUTHENTICATING..." : "LOGIN"}
              </PixelButton>

              <SocialAuthButtons />
            </form>

            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                NO ACCOUNT?{" "}
                <a
                  onClick={() => navigate('/register')}
                  style={{ color: C.green, cursor: "pointer", letterSpacing: "0.06em" }}
                >
                  REGISTER
                </a>
              </div>
              <a
                onClick={() => navigate('/')}
                style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: "0.1em" }}
              >
                BACK TO HOME
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <SealFooter />
    </div>
  );
}
