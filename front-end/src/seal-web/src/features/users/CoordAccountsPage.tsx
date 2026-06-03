import { useEffect, useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelTabs,
} from "@/shared/components/PixelComponents";
import type { AccountApproval, User } from "@/shared/mocks/mockData";
import { approveUser, getPendingApprovals, rejectUser } from "./usersApi";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CoordAccountsPage() {
  const [approvals, setApprovals] = useState<AccountApproval[]>([]);
  const [userDirectory, setUserDirectory] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getPendingApprovals()
      .then(({ approvals: apiApprovals, users: apiUsers }) => {
        if (cancelled) return;
        setApprovals(apiApprovals);
        setUserDirectory(apiUsers);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load pending approvals");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length;

  const rows = approvals.filter(a => a.status === activeTab);

  async function approve(approval: AccountApproval) {
    setError(null);
    setActionUserId(approval.user_id);
    try {
      await approveUser(approval.user_id);
      setApprovals(prev => prev.map(a => a.approval_id === approval.approval_id ? { ...a, status: 'APPROVED' } : a));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve user");
    } finally {
      setActionUserId(null);
    }
  }

  async function confirmReject(approval: AccountApproval) {
    setError(null);
    setActionUserId(approval.user_id);
    try {
      await rejectUser(approval.user_id);
      setApprovals(prev => prev.map(a => a.approval_id === approval.approval_id ? { ...a, status: 'REJECTED', note: rejectNote || "Rejected" } : a));
      setRejectingId(null);
      setRejectNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject user");
    } finally {
      setActionUserId(null);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Account Approvals</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={[
          { id: "PENDING", label: `Pending (${pendingCount})` },
          { id: "APPROVED", label: `Approved (${approvedCount})` },
          { id: "REJECTED", label: `Rejected (${rejectedCount})` },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'PENDING' | 'APPROVED' | 'REJECTED')}
      />

      {error && (
        <PixelCard style={{ padding: 12, borderColor: "rgba(239,68,68,0.35)" }}>
          <span style={{ color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
            ERROR: {error}
          </span>
        </PixelCard>
      )}

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: "linear-gradient(90deg, #0d1117, #0a1020)", borderBottom: `1px solid ${C.border}` }}>
                {["Full Name", "Email", "Role", "Student Type", "Student ID", "University", "Applied", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>
                    {isLoading ? "Loading..." : "No records"}
                  </td>
                </tr>
              )}
              {rows.map((a, i) => {
                const u = userDirectory.find(uu => uu.user_id === a.user_id);
                if (!u) return null;
                return (
                  <tr key={a.approval_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : "rgba(10,12,15,0.5)" }}>
                    <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{u.full_name}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{u.email}</td>
                    <td style={{ padding: "12px 14px" }}><PixelBadge color="blue">{u.role.replace("_", " ")}</PixelBadge></td>
                    <td style={{ padding: "12px 14px" }}>
                      {u.student_type && <PixelBadge color={u.student_type === 'FPT' ? 'green' : 'cyan'}>{u.student_type}</PixelBadge>}
                    </td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{u.student_id ?? "-"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{u.university_name ?? "-"}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{fmtDate(a.created_at)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {activeTab === 'PENDING' && rejectingId !== a.approval_id && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <PixelButton size="sm" variant="cyber" disabled={actionUserId === a.user_id} onClick={() => approve(a)}>APPROVE</PixelButton>
                          <PixelButton size="sm" variant="danger" disabled={actionUserId === a.user_id} onClick={() => setRejectingId(a.approval_id)}>REJECT</PixelButton>
                        </div>
                      )}
                      {rejectingId === a.approval_id && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Reason..."
                            disabled={actionUserId === a.user_id}
                            style={{ padding: "4px 8px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: "none", borderRadius: 0 }}
                          />
                          <PixelButton size="sm" variant="danger" disabled={actionUserId === a.user_id} onClick={() => confirmReject(a)}>CONFIRM</PixelButton>
                          <PixelButton size="sm" variant="ghost" disabled={actionUserId === a.user_id} onClick={() => setRejectingId(null)}>CANCEL</PixelButton>
                        </div>
                      )}
                      {activeTab === 'REJECTED' && a.note && (
                        <span style={{ color: C.red, fontSize: 11 }}>{a.note}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}
