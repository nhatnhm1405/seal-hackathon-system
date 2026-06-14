import { useState } from "react";
import { useNavigate } from "react-router";
import { useForceDark } from "@/app/providers/ThemeProvider";
import { useAuth } from "@/app/providers/AuthProvider";
import { C, GradientText, PixelButton, PixelInput, FloatingParticles } from "@/shared/components/PixelComponents";
import { SealFooter } from "@/shared/components/SealFooter";
import { authApi, ApiError, CompleteProfilePayload } from "@/shared/apiClient";
import sealLogo from "@/imports/image.png";

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: C.surface2, border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none", boxSizing: "border-box",
};

export function CompleteProfilePage() {
  useForceDark();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [userType, setUserType] = useState<CompleteProfilePayload['userType']>('FPT_STUDENT');
  const [studentId, setStudentId] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isExternal = userType === 'EXTERNAL_STUDENT';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId.trim()) { setError("Student ID is required."); return; }
    if (isExternal && !university.trim()) { setError("University is required for external students."); return; }
    setSubmitting(true);
    try {
      await authApi.completeProfile({
        userType,
        studentId: studentId.trim(),
        university: isExternal ? university.trim() : undefined,
      });
      // Profile is now complete but the account still awaits coordinator approval.
      logout();
      navigate("/pending-approval", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: C.bg, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }} className="cyber-grid-bg">
        <FloatingParticles count={20} />
        <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ height: 72, display: "flex", alignItems: "center" }}>
              <img src={sealLogo} alt="SEAL" style={{ height: 132, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.4))" }} />
            </div>
          </div>

          <div style={{ width: "100%", maxWidth: 460, background: C.surface, border: `1px solid ${C.border}`, padding: 36, position: "relative", boxShadow: "0 0 40px rgba(34,197,94,0.06), 0 8px 32px rgba(0,0,0,0.5)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.6 }} />

            <div style={{ marginBottom: 24 }}>
              <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 10 }}>// complete_profile</div>
              <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: 26, lineHeight: 1.15, marginBottom: 10 }}>
                <GradientText>Almost there{currentUser ? `, ${currentUser.full_name}` : ""}</GradientText>
              </h1>
              <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8 }}>
                We got your name and email from your provider. Tell us your account type to finish signing up — your account will then await coordinator approval.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Student Type</label>
                <select value={userType} onChange={(e) => setUserType(e.target.value as CompleteProfilePayload['userType'])} style={selectStyle}>
                  <option value="FPT_STUDENT">FPT Student</option>
                  <option value="EXTERNAL_STUDENT">External Student</option>
                </select>
              </div>

              <PixelInput label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. SE150000" />
              {isExternal && (
                <PixelInput label="University" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Your university name" />
              )}

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 12px" }}>
                  ERROR: {error}
                </div>
              )}

              <PixelButton type="submit" variant="cyber" size="lg" fullWidth disabled={submitting}>
                {submitting ? "SAVING…" : "FINISH SIGN-UP"}
              </PixelButton>
            </form>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={() => { logout(); navigate("/login", { replace: true }); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.08em" }}>
                ← CANCEL & SIGN OUT
              </button>
            </div>
          </div>
        </div>
      </div>
      <SealFooter />
    </div>
  );
}
