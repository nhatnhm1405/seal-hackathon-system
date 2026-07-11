import { useCallback, useEffect, useState } from "react";
import { C, PixelButton, PixelBadge } from "@/shared/components/PixelComponents";
import {
  teamsApi, apiErrorMessage,
  type GroupingPreview, type GroupingProposedTeam, type GroupingWarning, type GroupingMember,
} from "@/shared/apiClient";

const MONO = "'JetBrains Mono', monospace";

interface Props {
  eventId: number;
  eventName: string;
  onClose: () => void;
  // Called after a successful commit so the parent can refresh its roster.
  onCommitted: (summary: string) => void;
}

/**
 * Coordinator SETUP tool: preview how leftover (under-sized) teams would be grouped
 * into valid ones, then apply it. Preview is a read-only dry run; APPLY is the
 * destructive step (creates/grows teams, dissolves solo teams), so it sits behind
 * a second confirm inside this modal.
 */
export function LeftoverGroupingModal({ eventId, onClose, onCommitted }: Props) {
  const [preview, setPreview] = useState<GroupingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    teamsApi.leftoverGroupingPreview(eventId)
      .then(res => setPreview(res.data))
      .catch(err => setError(apiErrorMessage(err, "Failed to load grouping preview.")))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  // Escape closes (never commits) while nothing is in flight.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !committing) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [committing, onClose]);

  async function commit() {
    setCommitting(true);
    setError(null);
    try {
      const res = await teamsApi.leftoverGroupingCommit(eventId);
      const r = res.data;
      onCommitted(
        `${r.teamsCreated} team(s) created, ${r.teamsGrown} grown, `
        + `${r.peoplePlaced} participant(s) placed`
        + (r.unresolvedWarnings > 0 ? `, ${r.unresolvedWarnings} left for manual handling.` : "."),
      );
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to apply grouping."));
      setConfirming(false);
      setCommitting(false);
    }
  }

  const nothingToDo = !loading && !error && preview
    && preview.proposedTeams.length === 0 && preview.warnings.length === 0;

  return (
    <>
      <div
        onClick={() => { if (!committing) onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(2px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401,
          width: "min(640px, calc(100vw - 32px))", maxHeight: "calc(100vh - 64px)", overflowY: "auto",
          background: C.surface, border: `1px solid ${C.green}66`,
          boxShadow: `0 0 40px ${C.greenGlow}, 0 16px 48px rgba(0,0,0,0.4)`, padding: 28,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, transparent)` }} />

        <h2 style={{
          fontFamily: MONO, fontSize: 18, fontWeight: 800, marginBottom: 18, width: "fit-content",
          background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text",
          WebkitTextFillColor: "transparent", color: "transparent",
        }}>
          Group Leftover Configuration
        </h2>

        {loading && (
          <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 12, padding: "24px 0" }}>Loading preview…</div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: MONO, fontSize: 11, padding: "8px 12px", marginBottom: 16 }}>
            ERROR: {error}
          </div>
        )}

        {nothingToDo && (
          <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 12, padding: "16px 0", lineHeight: 1.7 }}>
            ✓ No leftover participants — every team already has at least 3 members. Nothing to group.
          </div>
        )}

        {!loading && preview && !nothingToDo && (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 18 }}>
              <Stat label="Leftover people" value={preview.leftoverPeople} />
              <Stat label="Solo entrants" value={preview.soloCount} />
              <Stat label="Pairs kept" value={preview.pairCount} />
            </div>

            {preview.proposedTeams.length > 0 && (
              <div style={{ marginBottom: preview.warnings.length ? 18 : 8 }}>
                <SectionLabel>Proposed teams ({preview.proposedTeams.length})</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {preview.proposedTeams.map((t, i) => <ProposedTeamRow key={i} team={t} />)}
                </div>
              </div>
            )}

            {preview.warnings.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <SectionLabel>Needs your attention ({preview.warnings.length})</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {preview.warnings.map((w, i) => <WarningRow key={i} warning={w} />)}
                </div>
              </div>
            )}
          </>
        )}

        {confirming && !nothingToDo && (
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.4)", color: C.yellow, fontFamily: MONO, fontSize: 11, lineHeight: 1.7, padding: "10px 12px", margin: "16px 0" }}>
            ⚠ This will create/grow teams and dissolve solo teams. It can't be auto-undone. Apply?
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {!nothingToDo && !confirming && (
            <PixelButton variant="cyber" onClick={() => setConfirming(true)}
              disabled={loading || !!error || !preview || preview.proposedTeams.length === 0}>
              APPLY GROUPING
            </PixelButton>
          )}
          {!nothingToDo && confirming && (
            <PixelButton variant="cyber" onClick={commit} disabled={committing}>
              {committing ? "APPLYING…" : "CONFIRM APPLY"}
            </PixelButton>
          )}
          <PixelButton variant="secondary" onClick={onClose} disabled={committing}>
            {nothingToDo ? "CLOSE" : "CANCEL"}
          </PixelButton>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: C.green, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted, marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// Renders people as a compact table. `addedIds` marks newly-added members with a tag.
function MemberTable({ members, addedIds }: { members: GroupingMember[]; addedIds?: Set<number> }) {
  if (members.length === 0) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: MONO, fontSize: 11 }}>
      <tbody>
        {members.map((m, i) => (
          <tr key={m.userId} style={{ borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
            <td style={{ color: C.textMuted, padding: "5px 8px 5px 0", width: 22, textAlign: "right" }}>{i + 1}</td>
            <td style={{ color: C.text, padding: "5px 0" }}>{m.fullName}</td>
            <td style={{ padding: "5px 0", textAlign: "right", width: 44 }}>
              {addedIds?.has(m.userId) && (
                <span style={{ color: "#60a5fa", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>NEW</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProposedTeamRow({ team }: { team: GroupingProposedTeam }) {
  const roster = team.members.length ? team.members : team.addedMembers;
  const addedIds = new Set(team.addedMembers.map(m => m.userId));
  return (
    <div style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <PixelBadge color={team.origin === "NEW" ? "blue" : "green"}>
          {team.origin === "NEW" ? "NEW" : "GROWN"}
        </PixelBadge>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.text }}>{team.teamName}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>· {team.size} members</span>
      </div>
      <MemberTable members={roster} addedIds={team.origin === "EXISTING" ? addedIds : undefined} />
    </div>
  );
}

function WarningRow({ warning }: { warning: GroupingWarning }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.35)" }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.yellow, lineHeight: 1.7, marginBottom: warning.people.length ? 6 : 0 }}>⚠ {warning.message}</div>
      <MemberTable members={warning.people} />
    </div>
  );
}
