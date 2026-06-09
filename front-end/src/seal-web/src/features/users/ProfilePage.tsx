import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import { teams, tracks } from "@/shared/mocks/mockData";

const MOCK_PASSWORD = "password";

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", padding: 4,
        display: "flex", alignItems: "center",
        color: hover ? C.text : C.textMuted,
        transition: "color 0.15s",
      }}
    >
      {visible ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}

export function ProfilePage() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState("overview");

  const [editName, setEditName] = useState(currentUser?.full_name ?? "");
  const [editEmail, setEditEmail] = useState(currentUser?.email ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Show/hide toggles for each password field
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  if (!currentUser) return null;

  const team = currentUser.team_id ? teams.find(t => t.team_id === currentUser.team_id) : null;
  const track = team ? tracks.find(tr => tr.track_id === team.track_id) : null;

  function saveProfile() {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (currentPwd !== MOCK_PASSWORD) {
      setPwdError("Current password is incorrect.");
      return;
    }
    if (newPwd.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPwd === MOCK_PASSWORD) {
      setPwdError("New password must be different from the current password.");
      return;
    }

    setPwdSuccess(true);
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setTimeout(() => setPwdSuccess(false), 3000);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: C.surface2,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    borderRadius: 0,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = C.green;
    e.currentTarget.style.boxShadow = "0 0 0 1px rgba(34,197,94,0.35)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = C.border;
    e.currentTarget.style.boxShadow = "none";
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
            <Field label="Full Name" value={currentUser.full_name} />
            <Field label="Email" value={currentUser.email} />
            <Field label="Role" badge={<PixelBadge color="blue">{currentUser.role.replace("_", " ")}</PixelBadge>} />
            <Field label="Student Type" badge={currentUser.student_type ? <PixelBadge color={currentUser.student_type === 'FPT' ? 'green' : 'cyan'}>{currentUser.student_type}</PixelBadge> : <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>—</span>} />
            <Field label="Student ID" value={currentUser.student_id ?? "—"} />
            <Field label="University" value={currentUser.university ?? "—"} />
            {team && (
              <>
                <Field label="Team" value={team.name} />
                <Field label="Track" value={track?.name ?? "—"} />
              </>
            )}
          </div>
        </PixelCard>
      )}

      {tab === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Profile info */}
          <PixelCard style={{ padding: 24 }}>
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
              // profile_info
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
              <PixelInput label="Full Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <PixelInput label="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              {profileSaved && (
                <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.35)", color: C.green, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  ✓ Profile changes saved.
                </div>
              )}
              <div>
                <PixelButton variant="cyber" onClick={saveProfile}>SAVE PROFILE</PixelButton>
              </div>
            </div>
          </PixelCard>

          {/* Change password */}
          <PixelCard style={{ padding: 24 }}>
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
              // change_password
            </div>
            <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
              <div>
                <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Current Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => { setCurrentPwd(e.target.value); setPwdError(null); setPwdSuccess(false); }}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <EyeToggle visible={showCurrentPwd} onToggle={() => setShowCurrentPwd((v) => !v)} />
                </div>
              </div>

              <div style={{ height: 1, background: C.border }} />

              <div>
                <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  New Password
                  <span style={{ color: C.textMuted, marginLeft: 8, letterSpacing: "0.06em" }}>(min 8 chars)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); setPwdError(null); setPwdSuccess(false); }}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <EyeToggle visible={showNewPwd} onToggle={() => setShowNewPwd((v) => !v)} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Confirm New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPwd ? "text" : "password"}
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(null); setPwdSuccess(false); }}
                    placeholder="••••••••"
                    style={{
                      ...inputStyle,
                      paddingRight: 40,
                      borderColor: confirmPwd && newPwd && confirmPwd !== newPwd ? "rgba(239,68,68,0.6)" : C.border,
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <EyeToggle visible={showConfirmPwd} onToggle={() => setShowConfirmPwd((v) => !v)} />
                </div>
                {confirmPwd && newPwd && confirmPwd !== newPwd && (
                  <div style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 6, letterSpacing: "0.04em" }}>
                    Passwords do not match
                  </div>
                )}
              </div>

              {/* Strength hints */}
              {newPwd && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {[4, 8, 12].map((threshold, i) => (
                    <div
                      key={threshold}
                      style={{
                        height: 3,
                        flex: 1,
                        background: newPwd.length >= threshold
                          ? i === 0 ? "#ef4444" : i === 1 ? "#eab308" : C.green
                          : C.surface3,
                        transition: "background 0.2s",
                      }}
                    />
                  ))}
                  <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                    {newPwd.length < 4 ? "WEAK" : newPwd.length < 8 ? "FAIR" : newPwd.length < 12 ? "GOOD" : "STRONG"}
                  </span>
                </div>
              )}

              {pwdError && (
                <div style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  borderLeft: "3px solid #ef4444",
                  color: C.red,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: "10px 14px",
                  letterSpacing: "0.04em",
                }}>
                  ERROR: {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  borderLeft: `3px solid ${C.green}`,
                  color: C.green,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  padding: "10px 14px",
                  letterSpacing: "0.04em",
                }}>
                  ✓ Password changed successfully.
                </div>
              )}

              <div>
                <PixelButton type="submit" variant="cyber">UPDATE PASSWORD</PixelButton>
              </div>
            </form>
          </PixelCard>
        </div>
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
