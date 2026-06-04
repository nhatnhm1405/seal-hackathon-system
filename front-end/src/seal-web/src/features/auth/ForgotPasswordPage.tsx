import { useState } from "react";
import { useForceDark } from "@/app/providers/ThemeProvider";
import { useNavigate } from "react-router";
import { C, GradientText, PixelButton, PixelInput, FloatingParticles } from "@/shared/components/PixelComponents";
import { SealFooter } from "@/shared/components/SealFooter";
import { users } from "@/shared/mocks/mockData";
import sealLogo from "@/imports/image.png";

export function ForgotPasswordPage() {
  useForceDark();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    const found = users.find(u => u.email.toLowerCase() === trimmed && u.status === "ACTIVE");
    setSubmittedEmail(trimmed);
    setStatus(found ? "success" : "error");
  }

  return (
    <div style={{ background: C.bg, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }} className="cyber-grid-bg">
        <FloatingParticles count={20} />
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.07), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 24 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ height: 72, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
              <img src={sealLogo} alt="SEAL" style={{ height: 144, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.4))" }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}>
              <GradientText>HACKATHON Management System</GradientText>
            </span>
          </div>

          {/* Card */}
          <div style={{
            width: "100%",
            maxWidth: 440,
            background: C.surface,
            border: `1px solid ${C.border}`,
            padding: 36,
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 40px rgba(34,197,94,0.06), 0 8px 32px rgba(0,0,0,0.5)",
          }}>
            {/* Top glow line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.6 }} />
            <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTop: `2px solid ${C.green}`, borderLeft: `2px solid ${C.green}` }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottom: `2px solid rgba(59,130,246,0.5)`, borderRight: `2px solid rgba(59,130,246,0.5)` }} />

            <div style={{ marginBottom: 28 }}>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>
                // password_recovery
              </div>
              <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 30, lineHeight: 1.1, marginBottom: 10 }}>
                <GradientText>Forgot Password</GradientText>
              </h1>
              <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8 }}>
                Enter your account email and we'll send a reset link.
              </p>
            </div>

            {status === "idle" && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <PixelInput
                  label="Email"
                  placeholder="you@seal.edu"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PixelButton type="submit" variant="cyber" size="lg" fullWidth>
                  SEND RESET LINK
                </PixelButton>
              </form>
            )}

            {status === "success" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  borderLeft: `3px solid ${C.green}`,
                  color: C.green,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  padding: "14px 16px",
                  lineHeight: 1.7,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em" }}>RESET LINK SENT</div>
                  <div style={{ color: C.text }}>
                    A password reset link has been sent to{" "}
                    <span style={{ color: C.green, fontWeight: 700 }}>{submittedEmail}</span>.
                    Check your inbox.
                  </div>
                </div>
                <PixelButton variant="secondary" fullWidth onClick={() => setStatus("idle")}>
                  SEND AGAIN
                </PixelButton>
              </div>
            )}

            {status === "error" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderLeft: "3px solid #ef4444",
                  color: C.red,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  padding: "14px 16px",
                  lineHeight: 1.7,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em" }}>ERROR: EMAIL NOT FOUND</div>
                  <div style={{ color: C.textMuted }}>
                    No active account found for{" "}
                    <span style={{ color: C.red }}>{submittedEmail}</span>.
                    Please check the address and try again.
                  </div>
                </div>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <PixelInput
                    label="Email"
                    placeholder="you@seal.edu"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
                  />
                  <PixelButton type="submit" variant="cyber" size="lg" fullWidth>
                    RETRY
                  </PixelButton>
                </form>
              </div>
            )}

            {/* Back to login */}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button
                onClick={() => navigate("/login")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: C.textMuted, fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, letterSpacing: "0.08em", padding: 0,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
              >
                ← BACK TO LOGIN
              </button>
            </div>
          </div>
        </div>
      </div>
      <SealFooter />
    </div>
  );
}
