import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelCard, PixelBadge, PixelButton, PixelTabs,
} from "@/shared/components/PixelComponents";
import { AnnouncementComposerModal } from "@/shared/components/AnnouncementComposerModal";
import { assignmentsApi, announcementsApi, ApiError, MentorAssignedTeam, AnnouncementItem } from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Badge "đã nộp / chưa nộp" cho 1 team. */
function SubmissionBadge({ team }: { team: MentorAssignedTeam }) {
  return team.submissionCount > 0
    ? <PixelBadge color="green">SUBMITTED</PixelBadge>
    : <PixelBadge color="orange">NOT SUBMITTED</PixelBadge>;
}

export function MentorTracksPage() {
  const [teams, setTeams] = useState<MentorAssignedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTrack, setActiveTrack] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [history, setHistory] = useState<AnnouncementItem[]>([]);

  const loadHistory = useCallback(() => {
    announcementsApi.listMentor()
      .then(res => setHistory(res.data ?? []))
      .catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    assignmentsApi.getMentorAssignments()
      .then(res => {
        const list = res.data?.teams ?? [];
        setTeams(list);
        setActiveTrack(list[0]?.trackName ?? "");
      })
      .catch(err => setError(err instanceof ApiError ? err.message : "Failed to load mentor assignments."))
      .finally(() => setLoading(false));
    loadHistory();
  }, [loadHistory]);

  const trackNames = [...new Set(teams.map(t => t.trackName))];
  const trackTeams = teams.filter(t => t.trackName === activeTrack);
  const activeTrackId = trackTeams[0]?.trackId ?? null;
  const selectedTeam = selectedTeamId != null ? teams.find(t => t.teamId === selectedTeamId) ?? null : null;
  // History entries for the track currently in view.
  const trackHistory = history.filter(h => h.scope === "TRACK" && h.scopeLabel === activeTrack);

  function switchTrack(name: string) {
    setActiveTrack(name);
    setSelectedTeamId(null);
  }

  if (loading) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</p>
    </PixelCard></div>;
  }

  if (error) {
    return <div style={{ padding: 24 }}>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {error}</div>
    </div>;
  }

  if (trackNames.length === 0) {
    return <div style={{ padding: 24 }}><PixelCard style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>No tracks assigned to you.</p>
    </PixelCard></div>;
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}>
          <GradientText>My Tracks</GradientText>
        </h1>
        <PixelButton
          variant="cyber"
          onClick={() => setComposerOpen(true)}
          disabled={activeTrackId == null || trackTeams.length === 0}
        >
          ANNOUNCE TO {activeTrack || "TRACK"}
        </PixelButton>
      </div>

      <PixelTabs
        tabs={trackNames.map(t => ({ id: t, label: t }))}
        active={activeTrack}
        onChange={switchTrack}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Team list */}
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trackTeams.length === 0 && (
              <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No teams in this track.</div>
            )}
            {trackTeams.map(team => {
              const active = selectedTeamId === team.teamId;
              return (
                <button key={team.teamId} onClick={() => setSelectedTeamId(team.teamId)}
                  style={{
                    background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                    border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                    padding: "12px 14px", textAlign: "left", cursor: "pointer", borderRadius: 0,
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                    fontFamily: mono, color: C.text,
                  }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{team.teamName}</div>
                    <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{team.members.length} members</div>
                  </div>
                  <SubmissionBadge team={team} />
                </button>
              );
            })}
          </div>
        </PixelCard>

        {/* Team detail */}
        <PixelCard glow glowColor="blue" style={{ padding: 18 }}>
          {!selectedTeam ? (
            <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>Select a team to view details.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ color: C.text, fontFamily: mono, fontSize: 16, fontWeight: 700 }}>
                {selectedTeam.teamName}
              </div>
              <div>
                <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>MEMBERS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedTeam.members.map(m => (
                    <div key={m.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.surface2, border: `1px solid ${C.border}` }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: C.text, fontFamily: mono, fontSize: 12 }}>
                          {m.fullName}{m.memberRole === 'LEADER' ? " (Leader)" : ""}
                        </span>
                        <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</div>
                      </div>
                      <PixelBadge color={m.memberRole === 'LEADER' ? 'green' : 'gray'}>{m.memberRole}</PixelBadge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submission status */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", marginBottom: 8 }}>SUBMISSION STATUS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <SubmissionBadge team={selectedTeam} />
                  {selectedTeam.submissionCount > 0 ? (
                    <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>
                      {selectedTeam.submissionCount} submission{selectedTeam.submissionCount > 1 ? "s" : ""}
                      {selectedTeam.lastSubmittedAt ? ` · last ${fmtDateTime(selectedTeam.lastSubmittedAt)}` : ""}
                    </span>
                  ) : (
                    <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>
                      This team has not submitted yet.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </PixelCard>
      </div>

      {/* Sent announcements (this track) */}
      <PixelCard style={{ padding: 20 }}>
        <div style={{ color: C.green, fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 12 }}>
          SENT ANNOUNCEMENTS · {activeTrack || "—"}
        </div>
        {trackHistory.length === 0 ? (
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>
            No announcements sent to this track yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trackHistory.map(a => (
              <div key={a.announcementId} style={{ padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ color: C.text, fontFamily: mono, fontSize: 12, fontWeight: 700 }}>{a.title}</span>
                  <span style={{ color: C.textDim, fontFamily: mono, fontSize: 10, whiteSpace: "nowrap" }}>{fmtDateTime(a.createdAt)}</span>
                </div>
                <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 11, lineHeight: 1.6, marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.content}</div>
                <div style={{ color: C.textDim, fontFamily: mono, fontSize: 10, marginTop: 6 }}>Sent to {a.recipientCount} participant(s)</div>
              </div>
            ))}
          </div>
        )}
      </PixelCard>

      {activeTrackId != null && (
        <AnnouncementComposerModal
          open={composerOpen}
          scopeLabel={activeTrack}
          audienceHint={`${trackTeams.length} team(s) in this track`}
          onSend={(title, content, linkUrl) =>
            announcementsApi.createMentor({ trackId: activeTrackId, title, content, linkUrl })
              .then(res => res.data?.recipientCount ?? 0)}
          onSent={loadHistory}
          onClose={() => setComposerOpen(false)}
        />
      )}
    </div>
  );
}
