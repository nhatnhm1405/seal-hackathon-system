import { useEffect, useState } from "react";
import { C, GradientText, PixelBadge, PixelCard } from "@/shared/components/PixelComponents";
import { ApiError, assignmentsApi, MentorHistoryEntry } from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

export function MentorHistoryPage() {
  const [entries, setEntries] = useState<MentorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    assignmentsApi.getMentorHistory()
      .then((response) => setEntries(response.data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load mentoring history."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (eventId: number) =>
    setOpen((previous) => {
      const next = new Set(previous);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}><GradientText>Mentoring History</GradientText></h1>
        <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>
          Events you mentored, grouped by track and team result.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>
          ERROR: {error}
        </div>
      )}

      {loading ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>Loading...</div>
        </PixelCard>
      ) : entries.length === 0 ? (
        <PixelCard style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>No mentoring history yet.</div>
        </PixelCard>
      ) : entries.map((entry) => {
        const isOpen = open.has(entry.eventId);
        const teamCount = entry.tracks.reduce((total, track) => total + track.teams.length, 0);

        return (
          <PixelCard key={entry.eventId} glow gradient style={{ padding: 0, overflow: "hidden" }}>
            <div
              onClick={() => toggle(entry.eventId)}
              style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", cursor: "pointer", borderBottom: isOpen ? `1px solid ${C.border}` : "none" }}
            >
              <div style={{ flex: "1 1 240px" }}>
                <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: C.text }}>{entry.eventName}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                  {entry.tracks.length} track{entry.tracks.length === 1 ? "" : "s"} - {teamCount} team{teamCount === 1 ? "" : "s"}
                </div>
              </div>
              <PixelBadge color={entry.eventStatus === "COMPLETED" ? "gray" : "green"}>{entry.eventStatus}</PixelBadge>
              <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 14 }}>{isOpen ? "v" : ">"}</span>
            </div>

            {isOpen && (
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
                {entry.tracks.map((track) => (
                  <section key={track.trackId}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ width: 5, height: 18, background: C.green }} />
                      <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>{track.trackName}</span>
                    </div>
                    {track.teams.length === 0 ? (
                      <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No approved teams.</div>
                    ) : track.teams
                      .slice()
                      .sort((a, b) => (a.finalRank ?? 999) - (b.finalRank ?? 999))
                      .map((team) => (
                        <div key={team.teamId} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={{ color: C.text, minWidth: 170, fontWeight: 600 }}>{team.teamName}</span>
                          <span style={{ color: C.cyan, minWidth: 80 }}>{team.finalRank != null ? `Final #${team.finalRank}` : "-"}</span>
                          {team.prizeName && <span style={{ color: C.yellow, fontWeight: 700 }}>{team.prizeName}</span>}
                          <PixelBadge color={team.teamStatus === "DISQUALIFIED" ? "red" : "gray"}>{team.teamStatus}</PixelBadge>
                        </div>
                      ))}
                  </section>
                ))}
              </div>
            )}
          </PixelCard>
        );
      })}
    </div>
  );
}
