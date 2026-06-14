import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { authApi, teamsApi, ApiError, MyTeam } from "@/shared/apiClient";

export function ProfilePage() {
  const { currentUser, patchCurrentUser } = useAuth();
  const [tab, setTab] = useState("overview");
  const [team, setTeam] = useState<MyTeam | null>(null);

  const [fullName, setFullName] = useState(currentUser?.full_name ?? "");
  const [studentId, setStudentId] = useState(currentUser?.student_id ?? "");
  const [university, setUniversity] = useState(currentUser?.university ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'PARTICIPANT') {
      teamsApi.getMy().then(res => setTeam(res.data)).catch(() => setTeam(null));
    }
  }, [currentUser?.role]);

  if (!currentUser) return null;
  const isStudent = currentUser.student_type !== null;
  const isExternal = currentUser.student_type === 'EXTERNAL';

  async function save() {
    setError(null); setSaved(false);
    if (!fullName.trim()) { setError("Full name is required."); return; }
    setSaving(true);
    try {
      const res = await authApi.updateMe({
        fullName: fullName.trim(),
        studentId: isStudent ? studentId : undefined,
        university: isExternal ? university : undefined,
      });
      const p = res.data;
      patchCurrentUser({
        full_name: p.fullName,
        student_id: p.studentId ?? null,
        university: p.university ?? null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Profile</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={[{ id: "overview", label: "Overview" }, { id: "settings", label: "Settings" }]}
        active={tab} onChange={setTab}
      />

      {tab === "overview" && (
        <PixelCard glow gradient style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <Field label="Full Name" value={currentUser.full_name} />
            <Field label="Email" value={currentUser.email} />
            <Field label="Role" badge={<PixelBadge color="blue">{currentUser.role}</PixelBadge>} />
            <Field label="Student Type" badge={currentUser.student_type
              ? <PixelBadge color={currentUser.student_type === 'FPT' ? 'green' : 'cyan'}>{currentUser.student_type}</PixelBadge>
              : <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>—</span>} />
            <Field label="Student ID" value={currentUser.student_id ?? "—"} />
            <Field label="University" value={currentUser.university ?? "—"} />
            {team && (
              <>
                <Field label="Team" value={team.name} />
                <Field label="Track" value={team.trackName ?? "—"} />
              </>
            )}
          </div>
        </PixelCard>
      )}

      {tab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PixelCard style={{ padding: 24 }}>
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>// profile_info</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
              <PixelInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              {isStudent && (
                <PixelInput label="Student ID" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              )}
              {isExternal && (
                <PixelInput label="University" value={university} onChange={(e) => setUniversity(e.target.value)} />
              )}
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                Email and account type are managed by the administrator and cannot be changed here.
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 12px" }}>ERROR: {error}</div>
              )}
              {saved && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}>✓ Profile saved.</div>
              )}
              <div>
                <PixelButton variant="cyber" onClick={save} disabled={saving}>{saving ? "SAVING…" : "SAVE PROFILE"}</PixelButton>
              </div>
            </div>
          </PixelCard>

          <PixelCard style={{ padding: 24 }}>
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>// change_password</div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Password change isn't available yet — it requires a backend endpoint. Contact the organizers if you need a reset.
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value?: string; badge?: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {badge ?? <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>{value}</div>}
    </div>
  );
}
