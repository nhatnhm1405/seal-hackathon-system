import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  adminApi, eventsApi, ApiError,
  RoleGrantItem, UserItem, HackathonEvent, GrantRolePayload,
} from "@/shared/apiClient";

const GRANTABLE_ROLES: GrantRolePayload['roleName'][] = [
  'EVENT_COORDINATOR', 'MENTOR', 'JUDGE', 'SYSTEM_ADMIN',
];

function roleBadge(roleName: string) {
  if (roleName === 'SYSTEM_ADMIN') return <PixelBadge color="red">SYSTEM ADMIN</PixelBadge>;
  if (roleName === 'EVENT_COORDINATOR') return <PixelBadge color="purple">COORDINATOR</PixelBadge>;
  if (roleName === 'MENTOR') return <PixelBadge color="cyan">MENTOR</PixelBadge>;
  if (roleName === 'JUDGE') return <PixelBadge color="blue">JUDGE</PixelBadge>;
  return <PixelBadge color="gray">{roleName}</PixelBadge>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  background: C.surface2, border: `1px solid ${C.border}`, color: C.text,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", borderRadius: 0,
};

const labelStyle: React.CSSProperties = {
  display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
};

function ModalShell({ accent, tag, title, children, onCancel }: {
  accent: string; tag: string; title: string; children: React.ReactNode; onCancel: () => void;
}) {
  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401,
        width: "min(480px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto",
        background: C.surface, border: `1px solid ${accent}66`,
        boxShadow: `0 0 40px ${accent}22, 0 16px 48px rgba(0,0,0,0.4)`, padding: 32,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <div style={{ color: accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // {tag}
        </div>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 20, lineHeight: 1.2 }}>
          {title}
        </h2>
        {children}
      </div>
    </>
  );
}

// ── Grant role modal ─────────────────────────────────────────────────
function GrantRoleModal({ users, events, onClose, onGranted }: {
  users: UserItem[]; events: HackathonEvent[]; onClose: () => void; onGranted: () => void;
}) {
  const [userId, setUserId] = useState<number | "">("");
  const [roleName, setRoleName] = useState<GrantRolePayload['roleName']>('EVENT_COORDINATOR');
  const [eventId, setEventId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // SYSTEM_ADMIN and EVENT_COORDINATOR are system-wide (no event scope).
  const systemWide = roleName === 'SYSTEM_ADMIN' || roleName === 'EVENT_COORDINATOR';

  async function submit() {
    setError(null);
    if (userId === "") { setError("Please select a user."); return; }
    if (!systemWide && eventId === "") { setError("This role requires an event scope."); return; }
    setSaving(true);
    try {
      await adminApi.grantRole({
        userId: Number(userId),
        roleName,
        eventId: systemWide ? null : Number(eventId),
      });
      onGranted();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to grant role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell accent="#22c55e" tag="grant_role" title="Grant role" onCancel={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>User</label>
          <select style={inputStyle} value={userId} onChange={(e) => setUserId(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">— select user —</option>
            {users.map(u => (
              <option key={u.userId} value={u.userId}>{u.fullName} ({u.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={roleName} onChange={(e) => setRoleName(e.target.value as GrantRolePayload['roleName'])}>
            {GRANTABLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Event scope</label>
          <select style={inputStyle} value={systemWide ? "" : eventId} disabled={systemWide}
            onChange={(e) => setEventId(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">{systemWide ? "System-wide (no event)" : "— select event —"}</option>
            {!systemWide && events.map(ev => (
              <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>
            ))}
          </select>
        </div>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px" }}>
            ERROR: {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <PixelButton variant="cyber" onClick={submit} disabled={saving}>
            {saving ? "GRANTING…" : "GRANT ROLE"}
          </PixelButton>
          <PixelButton variant="secondary" onClick={onClose} disabled={saving}>CANCEL</PixelButton>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Revoke confirm modal ─────────────────────────────────────────────
function RevokeModal({ grant, onClose, onDone }: { grant: RoleGrantItem; onClose: () => void; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setError(null);
    setSaving(true);
    try {
      await adminApi.revokeRole({
        userId: grant.userId,
        roleName: grant.roleName as GrantRolePayload['roleName'],
        eventId: grant.eventId ?? null,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to revoke role.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell accent="#ef4444" tag="revoke_role" title="Revoke this role?" onCancel={onClose}>
      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: 20 }}>
        Revoke <span style={{ color: C.text, fontWeight: 700 }}>{grant.roleName}</span> from{" "}
        <span style={{ color: C.text, fontWeight: 700 }}>{grant.userFullName}</span>
        {grant.eventName ? <> for event <span style={{ color: C.text, fontWeight: 700 }}>{grant.eventName}</span></> : <> (system-wide)</>}?
      </p>
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 16 }}>
          ERROR: {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <PixelButton variant="danger" onClick={confirm} disabled={saving}>
          {saving ? "WORKING…" : "REVOKE ROLE"}
        </PixelButton>
        <PixelButton variant="secondary" onClick={onClose} disabled={saving}>CANCEL</PixelButton>
      </div>
    </ModalShell>
  );
}

export function AdminRolesPage() {
  const [grants, setGrants] = useState<RoleGrantItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RoleGrantItem | null>(null);

  function loadGrants() {
    return adminApi.getRoleGrants()
      .then(res => setGrants(res.data ?? []))
      .catch(err => setFetchError(err instanceof ApiError ? err.message : "Failed to load role grants."));
  }

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      adminApi.getRoleGrants().then(res => setGrants(res.data ?? [])),
      adminApi.getUsers().then(res => setUsers(res.data ?? [])).catch(() => setUsers([])),
      eventsApi.getAll().then(res => setEvents(res.data ?? [])).catch(() => setEvents([])),
    ])
      .catch(err => setFetchError(err instanceof ApiError ? err.message : "Failed to load role grants."))
      .finally(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const rows = query
    ? grants.filter(g => g.userFullName.toLowerCase().includes(query) || g.userEmail.toLowerCase().includes(query) || g.roleName.toLowerCase().includes(query))
    : grants;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Role Grants</GradientText>
        </h1>
        <PixelButton variant="cyber" size="sm" onClick={() => setGrantOpen(true)}>+ GRANT ROLE</PixelButton>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user or role..."
          style={{ width: 240, padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", borderRadius: 0 }}
        />
      </div>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["User", "Email", "Role", "Scope", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && fetchError && (
                <tr><td colSpan={5} style={{ padding: 20, color: C.red, fontSize: 12, textAlign: "center" }}>{fetchError}</td></tr>
              )}
              {!loading && !fetchError && rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No role grants</td></tr>
              )}
              {!loading && rows.map((g, i) => (
                <tr key={g.id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{g.userFullName}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{g.userEmail}</td>
                  <td style={{ padding: "12px 14px" }}>{roleBadge(g.roleName)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{g.eventName ?? "System-wide"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <PixelButton size="sm" variant="danger" onClick={() => setRevokeTarget(g)}>REVOKE</PixelButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {grantOpen && (
        <GrantRoleModal
          users={users}
          events={events}
          onClose={() => setGrantOpen(false)}
          onGranted={() => { setLoading(true); loadGrants().finally(() => setLoading(false)); }}
        />
      )}
      {revokeTarget && (
        <RevokeModal
          grant={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onDone={() => { setLoading(true); loadGrants().finally(() => setLoading(false)); }}
        />
      )}
    </div>
  );
}
