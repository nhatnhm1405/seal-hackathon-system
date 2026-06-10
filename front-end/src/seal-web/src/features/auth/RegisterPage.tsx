import { useState } from "react";
import { useForceDark } from "@/app/providers/ThemeProvider";
import { useNavigate } from "react-router";
import {
  C, GradientText, PixelButton, PixelInput, PixelCard, FloatingParticles,
} from "@/shared/components/PixelComponents";
import { SealFooter } from "@/shared/components/SealFooter";
import { SocialAuthButtons } from "@/features/auth/SocialAuthButtons";
import sealLogo from "@/imports/image.png";
import { apiFetch, ApiError } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

type StudentType = 'FPT' | 'EXTERNAL';

export function RegisterPage() {
  useForceDark();
  const navigate = useNavigate();
  const { addAuthToast } = useNotifications();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentType, setStudentType] = useState<StudentType>('FPT');
  const [studentId, setStudentId] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName || !email || !password) {
      setError("Please fill in all required fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          userType: studentType === 'FPT' ? 'FPT_STUDENT' : 'EXTERNAL_STUDENT',
          studentId: studentId || null,
          university: studentType === 'EXTERNAL' ? (university || null) : null,
        }),
      });
      addAuthToast({ type: 'success', title: 'REGISTRATION SUBMITTED', message: 'Your account is pending coordinator approval.' });
      navigate('/pending-approval');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("An account with this email already exists.");
        } else {
          setError(err.message || "Registration failed. Please try again.");
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: C.bg, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
    <div style={{ flex: 1, position: "relative", overflow: "hidden", padding: "40px 24px" }} className="cyber-grid-bg">
      <FloatingParticles count={26} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, justifyContent: "center" }}>
          <div style={{ height: 100, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img src={sealLogo} alt="HMS" style={{ height: 200, width: "auto", objectFit: "contain" }} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 36, lineHeight: 1.1 }}>
            <GradientText>Create Account</GradientText>
          </h1>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 10 }}>
            Submit your registration for coordinator approval.
          </p>
        </div>

        <PixelCard glow gradient style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <PixelInput label="Full Name" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <PixelInput label="Email" type="email" placeholder="you@seal.edu" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <PixelInput label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} showToggle />
              <PixelInput label="Confirm Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} showToggle />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Student Type
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {(['FPT', 'EXTERNAL'] as StudentType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStudentType(t)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      background: studentType === t ? "rgba(34,197,94,0.12)" : C.surface2,
                      border: studentType === t ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                      color: studentType === t ? C.green : C.textMuted,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      cursor: "pointer",
                      borderRadius: 0,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t === 'FPT' ? 'FPT Student' : 'External Student'}
                  </button>
                ))}
              </div>
            </div>

            {studentType === 'FPT' ? (
              <PixelInput label="FPT Student ID" placeholder="SE000000" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <PixelInput label="Student ID" placeholder="Your student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
                <PixelInput label="University Name" placeholder="e.g. Hanoi University" value={university} onChange={(e) => setUniversity(e.target.value)} />
              </div>
            )}

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.35)",
                color: C.red,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                padding: "10px 12px",
              }}>
                ERROR: {error}
              </div>
            )}

            <PixelButton type="submit" variant="cyber" size="lg" fullWidth disabled={submitting}>
              {submitting ? "SUBMITTING..." : "SUBMIT REGISTRATION"}
            </PixelButton>

            <SocialAuthButtons />
          </form>
        </PixelCard>

        <div style={{ marginTop: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            ALREADY HAVE AN ACCOUNT?{" "}
            <a onClick={() => navigate('/login')} style={{ color: C.green, cursor: "pointer", letterSpacing: "0.06em" }}>
              LOGIN
            </a>
          </span>
          <a
            onClick={() => navigate('/')}
            style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, cursor: "pointer", letterSpacing: "0.1em", transition: "color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}
          >
            ← BACK TO HOME
          </a>
        </div>
      </div>
    </div>
    <SealFooter />
    </div>
  );
}
