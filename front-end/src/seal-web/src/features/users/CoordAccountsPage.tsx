import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge,
} from "@/shared/components/PixelComponents";
import { accountApprovalsApi, ApiError, apiErrorMessage, PendingAccount } from "@/shared/apiClient";
import { usePendingAccounts } from "@/app/providers/PendingAccountsProvider";
import { useNotifications } from "@/app/providers/NotificationProvider";

// After the platform split, a Coordinator's only account responsibility is the
// approval queue. Full account management (list-all, edit, activate/deactivate,
// role grants) belongs to the System Admin under /api/admin. This page therefore
// talks ONLY to /api/account-approvals.

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function studentTypeBadge(userType: string) {
  if (userType === 'FPT_STUDENT') return <PixelBadge color="green">FPT</PixelBadge>;
  if (userType === 'EXTERNAL_STUDENT') return <PixelBadge color="cyan">EXTERNAL</PixelBadge>;
  if (userType === 'STAFF') return <PixelBadge color="blue">STAFF</PixelBadge>;
  return <PixelBadge color="gray">{userType}</PixelBadge>;
}

// ── Approve / Reject confirmation modal ──────────────────────────────
function ApprovalModal({ account, reject, onClose, onConfirm, working, error }: {
  account: PendingAccount;
  reject: boolean;
  onClose: () => void;
  onConfirm: () => void;
  working: boolean;
  error: string | null;
}) {
  const accent = reject ? "#ef4444" : "#22c55e";
  const name = <span style={{ color: C.text, fontWeight: 700 }}>"{account.fullName}"</span>;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401,
        width: "min(460px, calc(100vw - 32px))", background: C.surface, border: `1px solid ${accent}66`,
        boxShadow: `0 0 40px ${accent}22, 0 16px 48px rgba(0,0,0,0.4)`, padding: 32,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.2 }}>
          {reject ? "Reject this account?" : "Approve this account?"}
        </h2>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: 24 }}>
          {reject
            ? <>You are about to reject {name} ({account.email}). Their account will be deactivated and they will not be able to log in.</>
            : <>You are about to approve {name} ({account.email}). They will be able to log in once approved.</>}
        </p>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 16 }}>
            ERROR: {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton variant={reject ? "danger" : "cyber"} onClick={onConfirm} disabled={working}>
            {working ? "WORKING…" : reject ? "REJECT ACCOUNT" : "APPROVE ACCOUNT"}
          </PixelButton>
          <PixelButton variant="secondary" onClick={onClose} disabled={working}>CANCEL</PixelButton>
        </div>
      </div>
    </>
  );
}

export function CoordAccountsPage() {
  const [accounts, setAccounts] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ account: PendingAccount; reject: boolean } | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { setPendingCount } = usePendingAccounts();
  const { addToast } = useNotifications();

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    accountApprovalsApi.getPending()
      .then(res => {
        const list = res.data ?? [];
        setAccounts(list);
        setPendingCount(list.length);
      })
      .catch(err => setFetchError(err instanceof ApiError ? err.message : "Failed to load pending accounts."))
      .finally(() => setLoading(false));
  }, [setPendingCount]);

  const query = search.trim().toLowerCase();
  const rows = query
    ? accounts.filter(a => a.fullName.toLowerCase().includes(query) || a.email.toLowerCase().includes(query))
    : accounts;

  async function handleConfirm() {
    if (!confirmTarget) return;
    const { account, reject } = confirmTarget;
    setActionError(null);
    setWorking(true);
    try {
      if (reject) {
        await accountApprovalsApi.reject(account.userId);
      } else {
        await accountApprovalsApi.approve(account.userId);
      }
      // Either way the user leaves the pending queue.
      setAccounts(prev => {
        const next = prev.filter(a => a.userId !== account.userId);
        setPendingCount(next.length);
        return next;
      });
      addToast({
        type: reject ? "info" : "success",
        title: reject ? "ACCOUNT REJECTED" : "ACCOUNT APPROVED",
        message: `"${account.fullName}" ${reject ? "was rejected." : "can now log in."}`,
      });
      setConfirmTarget(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
      addToast({ type: "warning", title: "ACTION FAILED", message: apiErrorMessage(err, "Action failed.") });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Account Approvals</GradientText>
        </h1>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 6 }}>
          Review and approve accounts awaiting access. Full account management lives in the System Admin console.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <PixelBadge color="yellow">{accounts.length} PENDING</PixelBadge>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: 240, padding: "8px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, outline: "none", borderRadius: 0 }}
        />
      </div>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Full Name", "Email", "Student Type", "Student ID", "University", "Applied", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && fetchError && (
                <tr><td colSpan={7} style={{ padding: 20, color: C.red, fontSize: 12, textAlign: "center" }}>{fetchError}</td></tr>
              )}
              {!loading && !fetchError && rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No pending accounts</td></tr>
              )}
              {!loading && rows.map((a, i) => (
                <tr key={a.userId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{a.fullName}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.email}</td>
                  <td style={{ padding: "12px 14px" }}>{studentTypeBadge(a.userType)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.studentId ?? "—"}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.university ?? "—"}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{fmtDate(a.createdAt)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <PixelButton size="sm" variant="cyber" onClick={() => { setActionError(null); setConfirmTarget({ account: a, reject: false }); }}>APPROVE</PixelButton>
                      <PixelButton size="sm" variant="danger" onClick={() => { setActionError(null); setConfirmTarget({ account: a, reject: true }); }}>REJECT</PixelButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {confirmTarget && (
        <ApprovalModal
          account={confirmTarget.account}
          reject={confirmTarget.reject}
          working={working}
          error={actionError}
          onClose={() => { setConfirmTarget(null); setActionError(null); }}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
