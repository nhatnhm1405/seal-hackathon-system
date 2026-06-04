import { useState, useEffect } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelTabs,
} from "@/shared/components/PixelComponents";
import { apiFetch, ApiError } from "@/shared/apiClient";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Shape the API returns for a pending approval entry
interface ApiApprovalItem {
  approvalId?: number;
  approval_id?: number;
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
  createdAt?: string;
  created_at?: string;
  note?: string | null;
}

interface ApprovalRow {
  approvalId: number;
  userId: number;
  email: string;
  fullName: string;
  userType: string;
  studentId: string | null;
  universityName: string | null;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string | null;
}

function normalizeApproval(item: ApiApprovalItem, status: 'PENDING' | 'APPROVED' | 'REJECTED'): ApprovalRow {
  return {
    approvalId:    item.approvalId ?? item.approval_id ?? 0,
    userId:        item.userId ?? item.user_id ?? 0,
    email:         item.email ?? '',
    fullName:      item.fullName ?? item.full_name ?? '',
    userType:      item.userType ?? item.user_type ?? '',
    studentId:     item.studentId ?? item.student_id ?? null,
    universityName: item.universityName ?? item.university_name ?? item.university ?? null,
    createdAt:     item.createdAt ?? item.created_at ?? '',
    status,
    note:          item.note ?? null,
  };
}

function studentTypeBadge(userType: string) {
  if (userType === 'FPT_STUDENT') return <PixelBadge color="green">FPT</PixelBadge>;
  if (userType === 'EXTERNAL_STUDENT') return <PixelBadge color="cyan">EXTERNAL</PixelBadge>;
  if (userType === 'STAFF') return <PixelBadge color="blue">STAFF</PixelBadge>;
  return null;
}

export function CoordAccountsPage() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    apiFetch<{ data: ApiApprovalItem[] }>('/api/account-approvals/pending')
      .then(res => {
        setApprovals((res.data ?? []).map(item => normalizeApproval(item, 'PENDING')));
      })
      .catch(err => {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load approvals.");
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingCount  = approvals.filter(a => a.status === 'PENDING').length;
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length;

  const rows = approvals.filter(a => a.status === activeTab);

  async function approve(approvalId: number) {
    setActionError(null);
    try {
      await apiFetch(`/api/account-approvals/${approvalId}/approve`, { method: 'PUT' });
      setApprovals(prev => prev.map(a => a.approvalId === approvalId ? { ...a, status: 'APPROVED' } : a));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  async function confirmReject(approvalId: number) {
    setActionError(null);
    try {
      await apiFetch(`/api/account-approvals/${approvalId}/reject`, {
        method: 'PUT',
        body: rejectNote ? JSON.stringify({ note: rejectNote }) : undefined,
      });
      setApprovals(prev => prev.map(a =>
        a.approvalId === approvalId ? { ...a, status: 'REJECTED', note: rejectNote || "Rejected" } : a,
      ));
      setRejectingId(null);
      setRejectNote("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Account Approvals</GradientText>
        </h1>
      </div>

      {actionError && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px" }}>
          ERROR: {actionError}
        </div>
      )}

      <PixelTabs
        tabs={[
          { id: "PENDING",  label: `Pending (${pendingCount})` },
          { id: "APPROVED", label: `Approved (${approvedCount})` },
          { id: "REJECTED", label: `Rejected (${rejectedCount})` },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'PENDING' | 'APPROVED' | 'REJECTED')}
      />

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
                <tr><td colSpan={7} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No records</td></tr>
              )}
              {!loading && rows.map((a, i) => (
                <tr key={a.approvalId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{a.fullName}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.email}</td>
                  <td style={{ padding: "12px 14px" }}>{studentTypeBadge(a.userType)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.studentId ?? "—"}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.universityName ?? "—"}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{a.createdAt ? fmtDate(a.createdAt) : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {activeTab === 'PENDING' && rejectingId !== a.approvalId && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <PixelButton size="sm" variant="cyber" onClick={() => approve(a.approvalId)}>APPROVE</PixelButton>
                        <PixelButton size="sm" variant="danger" onClick={() => { setRejectingId(a.approvalId); setActionError(null); }}>REJECT</PixelButton>
                      </div>
                    )}
                    {rejectingId === a.approvalId && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          value={rejectNote}
                          onChange={(e) => setRejectNote(e.target.value)}
                          placeholder="Reason..."
                          style={{ padding: "4px 8px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, outline: "none", borderRadius: 0 }}
                        />
                        <PixelButton size="sm" variant="danger" onClick={() => confirmReject(a.approvalId)}>CONFIRM</PixelButton>
                        <PixelButton size="sm" variant="ghost" onClick={() => setRejectingId(null)}>CANCEL</PixelButton>
                      </div>
                    )}
                    {activeTab === 'REJECTED' && a.note && (
                      <span style={{ color: C.red, fontSize: 11 }}>{a.note}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}
