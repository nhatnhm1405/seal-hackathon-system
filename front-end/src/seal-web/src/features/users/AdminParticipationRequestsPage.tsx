import { useEffect, useState } from "react";
import {
  C, GradientText, PixelBadge, PixelButton, PixelCard,
} from "@/shared/components/PixelComponents";
import {
  ApiError,
  apiErrorMessage,
  ParticipationAccessRequest,
  participationRequestsApi,
} from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function userTypeBadge(userType: string) {
  if (userType === "FPT_STUDENT") return <PixelBadge color="green">FPT</PixelBadge>;
  if (userType === "EXTERNAL_STUDENT") return <PixelBadge color="cyan">EXTERNAL</PixelBadge>;
  if (userType === "STAFF") return <PixelBadge color="blue">STAFF</PixelBadge>;
  return <PixelBadge color="gray">{userType}</PixelBadge>;
}

export function AdminParticipationRequestsPage() {
  const { addToast } = useNotifications();
  const [requests, setRequests] = useState<ParticipationAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    participationRequestsApi.getPending()
      .then(res => setRequests(res.data ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load participation requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function resolveRequest(request: ParticipationAccessRequest, approve: boolean) {
    setError(null);
    setWorkingId(request.requestId);
    try {
      if (approve) {
        await participationRequestsApi.approve(request.requestId);
      } else {
        await participationRequestsApi.reject(request.requestId);
      }
      setRequests(prev => prev.filter(r => r.requestId !== request.requestId));
      addToast({
        type: approve ? "success" : "info",
        title: approve ? "ACCESS APPROVED" : "ACCESS REJECTED",
        message: `${request.fullName} (${request.email}) ${approve ? "can participate again." : "stays locked."}`,
      });
    } catch (err) {
      const message = apiErrorMessage(err, "Action failed.");
      setError(message);
      addToast({ type: "warning", title: "ACTION FAILED", message });
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Participation Requests</GradientText>
        </h1>
        <PixelBadge color="cyan">{requests.length} PENDING</PixelBadge>
      </div>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>
            Participation Access Requests
          </div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
            Students with isActive=false request participation access here.
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "10px 14px", margin: 16 }}>
            ERROR: {error}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Full Name", "Email", "Type", "Requested", "Actions"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} style={{ padding: 18, color: C.textMuted, fontSize: 12, textAlign: "center" }}>Loading...</td></tr>
              )}
              {!loading && !error && requests.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 18, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No pending participation access requests</td></tr>
              )}
              {!loading && requests.map((r, i) => (
                <tr key={r.requestId} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                  <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{r.fullName}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{r.email}</td>
                  <td style={{ padding: "12px 14px" }}>{userTypeBadge(r.userType)}</td>
                  <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{fmtDate(r.requestedAt)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <PixelButton size="sm" variant="cyber" disabled={workingId === r.requestId} onClick={() => resolveRequest(r, true)}>APPROVE</PixelButton>
                      <PixelButton size="sm" variant="danger" disabled={workingId === r.requestId} onClick={() => resolveRequest(r, false)}>REJECT</PixelButton>
                    </div>
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
