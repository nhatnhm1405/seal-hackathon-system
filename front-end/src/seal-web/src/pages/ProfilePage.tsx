import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { users, teams, tracks } from "@/shared/mocks/mockData";

export function ProfilePage() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("overview");
  const userRecord = currentUser ? users.find(u => u.user_id === currentUser.user_id) : null;

  const [editName, setEditName] = useState(currentUser?.full_name ?? "");
  const [editEmail, setEditEmail] = useState(currentUser?.email ?? "");
  const [pwd, setPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!currentUser || !userRecord) return null;

  const team = currentUser.team_id ? teams.find(t => t.team_id === currentUser.team_id) : null;
  const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;

  function save() {
    setSavedMsg("Changes saved.");
    setTimeout(() => setSavedMsg(null), 2500);
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Profile</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "settings", label: "Settings" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <PixelCard glow gradient style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            <Field label="Full Name" value={userRecord.full_name} />
            <Field label="Email" value={userRecord.email} />
            <Field label="Role" badge={<PixelBadge color="blue">{userRecord.role.replace("_", " ")}</PixelBadge>} />
            <Field label="Student Type" badge={userRecord.student_type ? <PixelBadge color={userRecord.student_type === 'FPT' ? 'green' : 'cyan'}>{userRecord.student_type}</PixelBadge> : <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>—</span>} />
            <Field label="Student ID" value={userRecord.student_id ?? "—"} />
            <Field label="University" value={userRecord.university_name ?? "—"} />
            {team && (
              <>
                <Field label="Team" value={team.team_name} />
                <Field label="Track" value={track?.track_name ?? "—"} />
              </>
            )}
          </div>
        </PixelCard>
      )}

      {tab === "settings" && (
        <PixelCard style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
            <PixelInput label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <PixelInput label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            <PixelInput label="Current Password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <PixelInput label="New Password" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            {savedMsg && (
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {savedMsg}
              </div>
            )}
            <div>
              <PixelButton variant="cyber" onClick={save}>SAVE CHANGES</PixelButton>
            </div>
          </div>
        </PixelCard>
      )}
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value?: string; badge?: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      {badge ?? (
        <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>
          {value}
        </div>
      )}
    </div>
  );
}
