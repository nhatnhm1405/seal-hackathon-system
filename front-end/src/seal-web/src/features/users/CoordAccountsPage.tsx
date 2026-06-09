import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelTabs,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError } from "@/shared/apiClient";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Shape the API returns for a user account (GET /api/users)
interface ApiAccountItem {
  userId?: number;
  user_id?: number;
  email?: string;
  fullName?: string;
  full_name?: string;
  userType?: string;
  user_type?: string;
  studentId?: string | null;
  student_id?: string | null;
  university?: string | null;
  universityName?: string | null;
  university_name?: string | null;
  isApproved?: boolean | null;
  is_approved?: boolean | null;
  isActive?: boolean | null;
  is_active?: boolean | null;
  expiredAt?: string | null;
  expired_at?: string | null;
  createdAt?: string;
  created_at?: string;
  note?: string | null;
}

interface AccountRow {
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  studentId: string | null;
  universityName: string | null;
  createdAt: string;
  expiredAt: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isActive: boolean;
  note: string | null;
}

// Coordinator API only stores is_approved / is_active flags — derive a
// PENDING / APPROVED / REJECTED status from them for the tabs below.
function deriveStatus(isApproved: boolean, isActive: boolean): 'PENDING' | 'APPROVED' | 'REJECTED' {
  if (isApproved) return 'APPROVED';
  return isActive ? 'PENDING' : 'REJECTED';
}

function normalizeAccount(item: ApiAccountItem): AccountRow {
  const isApproved = item.isApproved ?? item.is_approved ?? false;
  const isActive   = item.isActive ?? item.is_active ?? true;
  return {
    userId:        item.userId ?? item.user_id ?? 0,
    email:         item.email ?? '',
    fullName:      item.fullName ?? item.full_name ?? '',
    userType:      item.userType ?? item.user_type ?? '',
    studentId:     item.studentId ?? item.student_id ?? null,
    universityName: item.universityName ?? item.university_name ?? item.university ?? null,
    createdAt:     item.createdAt ?? item.created_at ?? '',
    expiredAt:     item.expiredAt ?? item.expired_at ?? null,
    status:        deriveStatus(Boolean(isApproved), Boolean(isActive)),
    isActive:      Boolean(isActive),
    note:          item.note ?? null,
  };
}

function studentTypeBadge(userType: string) {
  if (userType === 'FPT_STUDENT') return <PixelBadge color="green">FPT</PixelBadge>;
  if (userType === 'EXTERNAL_STUDENT') return <PixelBadge color="cyan">EXTERNAL</PixelBadge>;
  if (userType === 'STAFF') return <PixelBadge color="blue">STAFF</PixelBadge>;
  return null;
}

function statusBadge(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
  if (status === 'APPROVED') return <PixelBadge color="green">APPROVED</PixelBadge>;
  if (status === 'REJECTED') return <PixelBadge color="red">REJECTED</PixelBadge>;
  return <PixelBadge color="yellow">PENDING</PixelBadge>;
}

// is_approved and is_active are independent flags — show login access separately
// from approval status so e.g. an approved-but-deactivated account is visible.
function activeBadge(isActive: boolean) {
  return isActive
    ? <PixelBadge color="cyan">ACTIVE</PixelBadge>
    : <PixelBadge color="gray">INACTIVE</PixelBadge>;
}

// ── UserEventRole (staff) — GET /api/users/roles ─────────────────────
// Backend already resolves names via joins (Role.roleName, HackathonEvent.name,
// Track.name, Round.name, User.fullName) so the table never has to show raw IDs.
interface ApiUserEventRoleItem {
  id?: number;
  userId?: number; user_id?: number;
  userFullName?: string; user_full_name?: string;
  userEmail?: string; user_email?: string;
  roleName?: string; role_name?: string;
  eventId?: number | null; event_id?: number | null;
  eventName?: string | null; event_name?: string | null;
  trackId?: number | null; track_id?: number | null;
  trackName?: string | null; track_name?: string | null;
  roundId?: number | null; round_id?: number | null;
  roundName?: string | null; round_name?: string | null;
  judgeType?: string | null; judge_type?: string | null;
  assignedAt?: string; assigned_at?: string;
  assignedById?: number | null; assigned_by_id?: number | null;
  assignedByName?: string | null; assigned_by_name?: string | null;
}

interface StaffRoleRow {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  roleName: string;
  eventName: string | null;
  trackName: string | null;
  roundName: string | null;
  judgeType: string | null;
  assignedAt: string;
  assignedByName: string | null;
}

function normalizeStaffRole(item: ApiUserEventRoleItem): StaffRoleRow {
  return {
    id:             item.id ?? 0,
    userId:         item.userId ?? item.user_id ?? 0,
    userFullName:   item.userFullName ?? item.user_full_name ?? '',
    userEmail:      item.userEmail ?? item.user_email ?? '',
    roleName:       item.roleName ?? item.role_name ?? '',
    eventName:      item.eventName ?? item.name ?? null,
    trackName:      item.trackName ?? item.name ?? null,
    roundName:      item.roundName ?? item.name ?? null,
    judgeType:      item.judgeType ?? item.judge_type ?? null,
    assignedAt:     item.assignedAt ?? item.assigned_at ?? '',
    assignedByName: item.assignedByName ?? item.assigned_by_name ?? null,
  };
}

// Per the schema's scope rules: EVENT_COORDINATOR may be event-scoped or global,
// MENTOR is event+track scoped, JUDGE is event+round scoped (with judge_type).
function roleBadge(roleName: string) {
  if (roleName === 'EVENT_COORDINATOR') return <PixelBadge color="purple">COORDINATOR</PixelBadge>;
  if (roleName === 'MENTOR') return <PixelBadge color="cyan">MENTOR</PixelBadge>;
  if (roleName === 'JUDGE') return <PixelBadge color="blue">JUDGE</PixelBadge>;
  return <PixelBadge color="gray">{roleName}</PixelBadge>;
}

function judgeTypeBadge(judgeType: string | null) {
  if (judgeType === 'GUEST') return <PixelBadge color="orange">GUEST</PixelBadge>;
  if (judgeType === 'INTERNAL') return <PixelBadge color="green">INTERNAL</PixelBadge>;
  return null;
}

type AccountActionType = 'approve' | 'reject' | 'restore' | 'deactivate' | 'activate';

interface AccountActionConfig {
  accent: string;
  buttonVariant: "primary" | "secondary" | "ghost" | "danger" | "cyber";
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
}

function getAccountActionConfig(type: AccountActionType, account: AccountRow): AccountActionConfig {
  const name = <span style={{ color: C.text, fontWeight: 700 }}>"{account.fullName}"</span>;
  switch (type) {
    case 'approve':
      return {
        accent: "#22c55e",
        buttonVariant: "cyber",
        title: "Approve this account?",
        message: <>You are about to approve {name} ({account.email}). They will be able to log in once approved.</>,
        confirmLabel: "APPROVE ACCOUNT",
      };
    case 'reject':
      return {
        accent: "#ef4444",
        buttonVariant: "danger",
        title: "Reject this account?",
        message: <>You are about to reject {name} ({account.email}). Their account will be deactivated and they will not be able to log in.</>,
        confirmLabel: "REJECT ACCOUNT",
      };
    case 'restore':
      return {
        accent: "#facc15",
        buttonVariant: "secondary",
        title: "Restore this account?",
        message: <>You are about to restore {name} ({account.email}) back to <span style={{ color: C.text, fontWeight: 700 }}>Pending</span>. Their account will be reactivated and await approval again.</>,
        confirmLabel: "RESTORE ACCOUNT",
      };
    case 'deactivate':
      return {
        accent: "#ef4444",
        buttonVariant: "danger",
        title: "Deactivate this account?",
        message: <>You are about to deactivate {name} ({account.email}). They will keep their <span style={{ color: C.text, fontWeight: 700 }}>Approved</span> status but will not be able to log in until reactivated.</>,
        confirmLabel: "DEACTIVATE ACCOUNT",
      };
    case 'activate':
      return {
        accent: "#22c55e",
        buttonVariant: "cyber",
        title: "Reactivate this account?",
        message: <>You are about to reactivate {name} ({account.email}). They will be able to log in again.</>,
        confirmLabel: "REACTIVATE ACCOUNT",
      };
  }
}

// ── Approve / Reject / Restore / Activate confirmation modal ─────────
function AccountActionModal({
  account,
  type,
  note,
  onNoteChange,
  onConfirm,
  onCancel,
}: {
  account: AccountRow;
  type: AccountActionType;
  note: string;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { accent, buttonVariant, title, message, confirmLabel } = getAccountActionConfig(type, account);

  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(2px)" }}
      />
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 401,
        width: "min(460px, calc(100vw - 32px))",
        background: C.surface,
        border: `1px solid ${accent}66`,
        boxShadow: `0 0 40px ${accent}22, 0 16px 48px rgba(0,0,0,0.4)`,
        padding: 32,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

        <div style={{ color: accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
          // confirm_{type}
        </div>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.2 }}>
          {title}
        </h2>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: type === 'reject' ? 16 : 24 }}>
          {message}
        </p>

        {type === 'reject' && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Reason (optional)
            </label>
            <input
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Reason for rejection..."
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", borderRadius: 0 }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton variant={buttonVariant} onClick={onConfirm}>
            {confirmLabel}
          </PixelButton>
          <PixelButton variant="secondary" onClick={onCancel}>
            CANCEL
          </PixelButton>
        </div>
      </div>
    </>
  );
}

export function CoordAccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'STAFF_ROLES'>('PENDING');
  const [confirmTarget, setConfirmTarget] = useState<{ type: AccountActionType; account: AccountRow } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [staffRoles, setStaffRoles] = useState<StaffRoleRow[]>([]);
  const [staffRolesLoaded, setStaffRolesLoaded] = useState(false);
  const [staffRolesLoading, setStaffRolesLoading] = useState(false);
  const [staffRolesError, setStaffRolesError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    apiFetch<{ data: ApiAccountItem[] }>('/api/users')
      .then(res => {
        setAccounts((res.data ?? []).map(normalizeAccount));
      })
      .catch(err => {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load accounts.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load staff role assignments only when the tab is first opened.
  useEffect(() => {
    if (activeTab !== 'STAFF_ROLES' || staffRolesLoaded) return;
    setStaffRolesLoading(true);
    setStaffRolesError(null);
    apiFetch<{ data: ApiUserEventRoleItem[] }>('/api/users/roles')
      .then(res => {
        setStaffRoles((res.data ?? []).map(normalizeStaffRole));
        setStaffRolesLoaded(true);
      })
      .catch(err => {
        setStaffRolesError(err instanceof ApiError ? err.message : "Failed to load staff role assignments.");
      })
      .finally(() => setStaffRolesLoading(false));
  }, [activeTab, staffRolesLoaded]);

  const allCount      = accounts.length;
  const pendingCount  = accounts.filter(a => a.status === 'PENDING').length;
  const approvedCount = accounts.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = accounts.filter(a => a.status === 'REJECTED').length;

  const tabRows = activeTab === 'ALL' ? accounts : accounts.filter(a => a.status === activeTab);
  const query = searchQuery.trim().toLowerCase();
  const rows = query ? tabRows.filter(a => a.fullName.toLowerCase().includes(query)) : tabRows;
  const staffRoleRows = query
    ? staffRoles.filter(r => r.userFullName.toLowerCase().includes(query))
    : staffRoles;

  function requestApprove(account: AccountRow) {
    setActionError(null);
    setRejectNote("");
    setConfirmTarget({ type: 'approve', account });
  }

  function requestReject(account: AccountRow) {
    setActionError(null);
    setRejectNote("");
    setConfirmTarget({ type: 'reject', account });
  }

  function requestRestore(account: AccountRow) {
    setActionError(null);
    setRejectNote("");
    setConfirmTarget({ type: 'restore', account });
  }

  function requestDeactivate(account: AccountRow) {
    setActionError(null);
    setRejectNote("");
    setConfirmTarget({ type: 'deactivate', account });
  }

  function requestActivate(account: AccountRow) {
    setActionError(null);
    setRejectNote("");
    setConfirmTarget({ type: 'activate', account });
  }

  function closeConfirm() {
    setConfirmTarget(null);
    setRejectNote("");
  }

  async function handleConfirmAction() {
    if (!confirmTarget) return;
    const { type, account } = confirmTarget;
    setActionError(null);
    try {
      if (type === 'approve') {
        await apiFetch(`/api/account-approvals/${account.userId}/approve`, { method: 'PUT' });
        setAccounts(prev => prev.map(a => a.userId === account.userId ? { ...a, status: 'APPROVED' } : a));
      } else if (type === 'reject') {
        await apiFetch(`/api/account-approvals/${account.userId}/reject`, {
          method: 'PUT',
          body: rejectNote ? JSON.stringify({ note: rejectNote }) : undefined,
        });
        setAccounts(prev => prev.map(a =>
          a.userId === account.userId ? { ...a, status: 'REJECTED', note: rejectNote || "Rejected" } : a,
        ));
      } else if (type === 'restore') {
        // Restore re-activates the account so it falls back into the pending pool.
        await apiFetch(`/api/users/${account.userId}/activate`, { method: 'PUT' });
        setAccounts(prev => prev.map(a =>
          a.userId === account.userId ? { ...a, status: 'PENDING', isActive: true, note: null } : a,
        ));
      } else if (type === 'deactivate') {
        // Deactivate only flips is_active — the account keeps its Approved status.
        await apiFetch(`/api/users/${account.userId}/deactivate`, { method: 'PUT' });
        setAccounts(prev => prev.map(a =>
          a.userId === account.userId ? { ...a, isActive: false } : a,
        ));
      } else {
        // Reactivate an approved account that was previously deactivated.
        await apiFetch(`/api/users/${account.userId}/activate`, { method: 'PUT' });
        setAccounts(prev => prev.map(a =>
          a.userId === account.userId ? { ...a, isActive: true } : a,
        ));
      }
      closeConfirm();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Accounts</GradientText>
        </h1>
      </div>

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <PixelTabs
          tabs={[
            { id: "ALL",         label: `All (${allCount})` },
            { id: "PENDING",     label: `Pending (${pendingCount})` },
            { id: "APPROVED",    label: `Approved (${approvedCount})` },
            { id: "REJECTED",    label: `Rejected (${rejectedCount})` },
            { id: "STAFF_ROLES", label: "Staff Roles" },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'STAFF_ROLES')}
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name..."
          style={{ width: 240, padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", borderRadius: 0 }}
        />
      </div>

      {activeTab === 'STAFF_ROLES' ? (
        <PixelCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                  {["Staff", "Email", "Role", "Event", "Track", "Round", "Judge Type", "Assigned At", "Assigned By"].map(h => (
                    <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffRolesLoading && (
                  <tr><td colSpan={9} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
                )}
                {!staffRolesLoading && staffRolesError && (
                  <tr><td colSpan={9} style={{ padding: 20, color: C.red, fontSize: 12, textAlign: "center" }}>{staffRolesError}</td></tr>
                )}
                {!staffRolesLoading && !staffRolesError && staffRoleRows.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No staff role assignments</td></tr>
                )}
                {!staffRolesLoading && staffRoleRows.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{r.userFullName}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.userEmail}</td>
                    <td style={{ padding: "12px 14px" }}>{roleBadge(r.roleName)}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.eventName ?? "All events"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.trackName ?? "—"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.roundName ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{judgeTypeBadge(r.judgeType) ?? <span style={{ color: C.textMuted, fontSize: 11 }}>—</span>}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.assignedAt ? fmtDate(r.assignedAt) : "—"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.assignedByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PixelCard>
      ) : (
        <PixelCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                  {["Full Name", "Email", "Student Type", "Student ID", "University", "Status", "Active", "Applied", "Expires", "Actions"].map(h => (
                    <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={10} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
                )}
                {!loading && fetchError && (
                  <tr><td colSpan={10} style={{ padding: 20, color: C.red, fontSize: 12, textAlign: "center" }}>{fetchError}</td></tr>
                )}
                {!loading && !fetchError && rows.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No records</td></tr>
                )}
                {!loading && rows.map((a, i) => (
                  <tr key={a.userId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{a.fullName}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.email}</td>
                    <td style={{ padding: "12px 14px" }}>{studentTypeBadge(a.userType)}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.studentId ?? "—"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.universityName ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>{statusBadge(a.status)}</td>
                    <td style={{ padding: "12px 14px" }}>{activeBadge(a.isActive)}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.createdAt ? fmtDate(a.createdAt) : "—"}</td>
                    <td style={{ fontSize: 11, padding: "12px 14px", color: a.expiredAt && new Date(a.expiredAt) < new Date() ? C.red : C.textMuted }}>
                      {a.expiredAt ? fmtDate(a.expiredAt) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {a.status === 'PENDING' && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <PixelButton size="sm" variant="cyber" onClick={() => requestApprove(a)}>APPROVE</PixelButton>
                          <PixelButton size="sm" variant="danger" onClick={() => requestReject(a)}>REJECT</PixelButton>
                        </div>
                      )}
                      {a.status === 'APPROVED' && (
                        a.isActive
                          ? <PixelButton size="sm" variant="danger" onClick={() => requestDeactivate(a)}>DEACTIVATE</PixelButton>
                          : <PixelButton size="sm" variant="cyber" onClick={() => requestActivate(a)}>REACTIVATE</PixelButton>
                      )}
                      {a.status === 'REJECTED' && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {a.note && <span style={{ color: C.red, fontSize: 11 }}>{a.note}</span>}
                          <PixelButton size="sm" variant="secondary" onClick={() => requestRestore(a)}>RESTORE</PixelButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PixelCard>
      )}

      {confirmTarget && (
        <AccountActionModal
          account={confirmTarget.account}
          type={confirmTarget.type}
          note={rejectNote}
          onNoteChange={setRejectNote}
          onConfirm={handleConfirmAction}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
