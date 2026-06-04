import { useState, useMemo } from "react";
import {
  C, GradientText, PixelCard, PixelInput,
} from "@/shared/components/PixelComponents";
import { auditLogs, users } from "@/shared/mocks/mockData";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US");
}

export function CoordAuditPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const filtered = useMemo(() => {
    return [...auditLogs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter(log => {
        if (fromDate && new Date(log.created_at) < new Date(fromDate)) return false;
        if (toDate && new Date(log.created_at) > new Date(toDate + "T23:59:59")) return false;
        if (actionFilter && !log.action_type.toLowerCase().includes(actionFilter.toLowerCase())) return false;
        return true;
      });
  }, [fromDate, toDate, actionFilter]);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Audit Log</GradientText>
        </h1>
      </div>

      <PixelCard style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 }}>
          <PixelInput label="From Date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <PixelInput label="To Date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <PixelInput label="Action Type" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. TEAM_APPROVED" />
        </div>
      </PixelCard>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0 }}>
                {["Timestamp", "Performed By", "Action", "Entity", "Entity ID", "Details"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No logs match the filters</td></tr>
              )}
              {filtered.map((log, i) => {
                const actor = users.find(u => u.user_id === log.performed_by);
                return (
                  <tr key={log.log_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{fmtDateTime(log.created_at)}</td>
                    <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{actor?.full_name ?? "System"}</td>
                    <td style={{ color: C.cyan, fontSize: 11, padding: "12px 14px" }}>{log.action_type}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{log.entity_type}</td>
                    <td style={{ color: C.textMuted, fontSize: 11, padding: "12px 14px" }}>{log.entity_id ?? "—"}</td>
                    <td style={{ color: C.text, fontSize: 12, padding: "12px 14px" }}>{log.details}</td>
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
