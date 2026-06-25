import { useState } from "react";
import { C, PixelButton, PixelInput, PixelBadge, TerminalWindow, FloatingParticles } from "@/shared/components/PixelComponents";
import sealLogo from "@/imports/image.png";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

interface AuthPageProps {
  navigate: (page: Page) => void;
}

export function AuthPage({ navigate }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [role, setRole] = useState<"hacker" | "judge" | "admin">("hacker");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("dashboard");
    }, 1200);
  };

  return (
    <div
      style={{ minHeight: "100vh", background: C.bg, display: "flex", position: "relative", overflow: "hidden" }}
      className="pixel-grid-bg"
    >
      <FloatingParticles count={20} />

      {/* Left panel — info */}
      <div
        className="hidden lg:flex"
        style={{
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 48px",
          background: "linear-gradient(135deg, #0d1117 0%, #0a0f0a 100%)",
          borderRight: `1px solid ${C.border}`,
          position: "relative",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <img
            src={sealLogo}
            alt="SEAL Hackathon"
            style={{
              height: 44,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 0 10px rgba(34,197,94,0.4)) drop-shadow(0 0 20px rgba(59,130,246,0.2))",
            }}
          />
          <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, letterSpacing: "0.1em" }}>
            <span style={{ background: C.gradientPrimary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>HACKATHON Management System</span>
          </span>
        </div>

        <div style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              color: C.text,
              fontSize: 36,
              fontWeight: 900,
              lineHeight: 1.2,
              marginBottom: 16,
              textShadow: `0 0 40px rgba(34,197,94,0.3)`,
            }}
          >
            Welcome to the<br />
            <span style={{ color: C.green }}>Hacker Console</span>
          </h2>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.8 }}>
            Sign in to access your dashboard, manage teams, submit projects, and compete on the leaderboard.
          </p>
        </div>

        <TerminalWindow title="system@seal-hms:~">
          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { cmd: "status --check", out: "All systems operational", color: C.green },
              { cmd: "events --active", out: "3 events running", color: C.text },
              { cmd: "teams --count", out: "320 registered teams", color: C.text },
              { cmd: "uptime", out: "99.97% reliability", color: C.green },
            ].map((line, i) => (
              <div key={i}>
                <div>
                  <span style={{ color: C.green }}>$ </span>
                  <span style={{ color: C.textMuted }}>{line.cmd}</span>
                </div>
                <div style={{ color: line.color, paddingLeft: 16 }}>→ {line.out}</div>
              </div>
            ))}
          </div>
        </TerminalWindow>

        <div className="flex gap-4 mt-8">
          {[
            { v: "2,400+", l: "Hackers" },
            { v: "48hr", l: "Sprints" },
            { v: "$50K", l: "Prizes" },
          ].map((s) => (
            <div key={s.l} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ color: C.green, fontSize: 20, fontWeight: 700, textShadow: `0 0 10px rgba(34,197,94,0.6)` }}>{s.v}</div>
              <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Back link */}
          <button
            onClick={() => navigate("landing")}
            style={{
              background: "none",
              border: "none",
              color: C.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              cursor: "pointer",
              marginBottom: 32,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 0,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = C.green)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = C.textMuted)}
          >
            BACK TO HOME
          </button>

          {/* Mode toggle */}
          <div
            style={{
              display: "flex",
              background: C.surface,
              border: `1px solid ${C.border}`,
              marginBottom: 32,
              borderRadius: 0,
            }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: mode === m ? C.green : "transparent",
                  color: mode === m ? "#000" : C.textMuted,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: mode === m ? 700 : 400,
                  transition: "all 0.2s",
                  boxShadow: mode === m ? `0 0 20px rgba(34,197,94,0.3)` : "none",
                }}
              >
                {m === "login" ? "[ LOGIN ]" : "[ REGISTER ]"}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: "'JetBrains Mono', monospace", color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {mode === "login" ? "Access Terminal" : "Create Account"}
            </h3>
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              {mode === "login"
                ? "Enter your credentials to initialize session"
                : "Register your hacker profile to join the battle"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <PixelInput
                label="Username"
                prefix="@"
                placeholder="cool_hacker"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}

            <PixelInput
              label="Email Address"
              type="email"
              placeholder="hacker@seal.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PixelInput
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showToggle
            />

            {mode === "register" && (
              <>
                <PixelInput
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  showToggle
                />

                {/* Role selector */}
                <div>
                  <label style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", display: "block", marginBottom: 8, textTransform: "uppercase" }}>
                    Account Type
                  </label>
                  <div className="flex gap-2">
                    {(["hacker", "judge", "admin"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        style={{
                          flex: 1,
                          padding: "8px 4px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          textTransform: "uppercase",
                          background: role === r ? "rgba(34,197,94,0.1)" : C.surface,
                          color: role === r ? C.green : C.textMuted,
                          border: role === r ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          borderRadius: 0,
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {mode === "login" && (
              <div className="flex justify-between items-center">
                <label style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: C.green }} />
                  Remember session
                </label>
                <button type="button" style={{ background: "none", border: "none", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer" }}>
                  Forgot password?
                </button>
              </div>
            )}

            <PixelButton
              type="submit"
              size="lg"
              fullWidth
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">...</span>
                  {mode === "login" ? "AUTHENTICATING..." : "CREATING ACCOUNT..."}
                </span>
              ) : mode === "login" ? (
                "INITIALIZE SESSION"
              ) : (
                "CREATE ACCOUNT"
              )}
            </PixelButton>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>

            {/* Demo login */}
            <PixelButton variant="secondary" fullWidth onClick={() => navigate("dashboard")}>
              DEMO ACCESS (NO LOGIN)
            </PixelButton>
          </form>

          {/* Terms */}
          {mode === "register" && (
            <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.6, marginTop: 16, textAlign: "center" }}>
              By registering you agree to our{" "}
              <span style={{ color: C.green, cursor: "pointer" }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: C.green, cursor: "pointer" }}>Privacy Policy</span>.
            </p>
          )}

          {/* Switch mode */}
          <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.textMuted }}>
            {mode === "login" ? "No account? " : "Have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: 0 }}
            >
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
