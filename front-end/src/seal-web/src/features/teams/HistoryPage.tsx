import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { C, GradientText, PixelBadge, PixelButton, PixelCard } from "@/shared/components/PixelComponents";
import { ApiError, TeamHistoryEntry, teamsApi } from "@/shared/apiClient";
import { CertificateModal } from "./CertificateModal";

const mono = "'JetBrains Mono', monospace";

function statusColor(status?: string): "green" | "gray" | "yellow" | "red" {
  if (status === "COMPLETED") return "gray";
  if (status === "DISQUALIFIED" || status === "REJECTED") return "red";
  if (status === "PENDING") return "yellow";
  return "green";
}

function standing(entry: TeamHistoryEntry): string {
  if (entry.prize) return entry.prize.name;
  const rounds = entry.rounds ?? [];
  const finalRound = rounds.find((round) => round.isFinal);
  if (finalRound) return `Finalist #${finalRound.rankPosition}`;
  const latestRound = rounds.at(-1);
  if (latestRound) return `${latestRound.roundName} #${latestRound.rankPosition}`;
  return entry.teamStatus ?? entry.eventStatus;
}

export function HistoryPage() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<TeamHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [certificate, setCertificate] = useState<TeamHistoryEntry | null>(null);

  useEffect(() => {
    teamsApi.getMyHistory()
      .then((response) => setEntries(response.data ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load history."))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (teamId: number) =>
    setOpen((previous) => {
      const next = new Set(previous);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}><GradientText>History</GradientText></h1>
        <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>
          Teams, submissions and results from events you joined.
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
          <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 13 }}>You have not joined any event yet.</div>
        </PixelCard>
      ) : (
        entries.map((entry) => {
          const isOpen = open.has(entry.teamId);
          const rounds = entry.rounds ?? [];
          const submissions = entry.submissions ?? [];
          const members = entry.members ?? [];
          const completed = entry.eventStatus === "COMPLETED";

          return (
            <PixelCard key={`${entry.eventId}-${entry.teamId}`} glow gradient style={{ padding: 0, overflow: "hidden" }}>
              <div
                onClick={() => toggle(entry.teamId)}
                style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", cursor: "pointer", borderBottom: isOpen ? `1px solid ${C.border}` : "none" }}
              >
                <div style={{ flex: "1 1 240px" }}>
                  <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 800, color: C.text }}>{entry.eventName}</div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                    Team <b style={{ color: C.text }}>{entry.teamName}</b>{entry.trackName ? ` - ${entry.trackName}` : ""} - {entry.myRole ?? "MEMBER"}
                  </div>
                </div>
                <PixelBadge color={statusColor(entry.eventStatus)}>{entry.eventStatus}</PixelBadge>
                <PixelBadge color={entry.prize ? "yellow" : "cyan"}>{standing(entry)}</PixelBadge>
                {completed && (
                  <PixelButton size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); setCertificate(entry); }}>
                    CERTIFICATE
                  </PixelButton>
                )}
                <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 14 }}>{isOpen ? "v" : ">"}</span>
              </div>

              {isOpen && (
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
                  <section>
                    <div style={sectionLabel}>Members</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {members.length === 0 ? (
                        <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No member data.</span>
                      ) : members.map((member, index) => (
                        <span key={index} style={{ fontFamily: mono, fontSize: 12, color: C.text, background: C.surface2, border: `1px solid ${C.border}`, padding: "4px 10px" }}>
                          {member.fullName}{member.role === "LEADER" ? " (Leader)" : ""}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div style={sectionLabel}>Round results</div>
                    {rounds.length === 0 ? (
                      <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No round result data.</div>
                    ) : rounds.map((round, index) => (
                      <div key={index} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: C.text, minWidth: 160 }}>{round.roundName}{round.isFinal ? " (Final)" : ""}</span>
                        <span style={{ color: C.cyan, fontWeight: 700 }}>#{round.rankPosition}</span>
                        <span style={{ color: C.green }}>{Number(round.totalScore).toFixed(1)}</span>
                        <PixelBadge color={round.advanced ? "green" : "gray"}>{round.advanced ? "Advanced" : "Finished"}</PixelBadge>
                      </div>
                    ))}
                  </section>

                  <section>
                    <div style={sectionLabel}>Submissions</div>
                    {submissions.length === 0 ? (
                      <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No submission data.</div>
                    ) : submissions.map((submission, index) => (
                      <div key={index} style={{ display: "flex", gap: 12, alignItems: "center", fontFamily: mono, fontSize: 12, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ color: C.text, minWidth: 160 }}>{submission.roundName}</span>
                        {submission.repoUrl && <a href={submission.repoUrl} target="_blank" rel="noreferrer" style={linkStyle}>repo</a>}
                        {submission.demoUrl && <a href={submission.demoUrl} target="_blank" rel="noreferrer" style={linkStyle}>demo</a>}
                        {submission.slideUrl && <a href={submission.slideUrl} target="_blank" rel="noreferrer" style={linkStyle}>slides</a>}
                        <PixelBadge color={submission.status === "LATE" ? "yellow" : "gray"}>{submission.status}</PixelBadge>
                      </div>
                    ))}
                  </section>
                </div>
              )}
            </PixelCard>
          );
        })
      )}

      {certificate && (
        <CertificateModal entry={certificate} recipientName={currentUser?.full_name ?? ""} onClose={() => setCertificate(null)} />
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.green,
  fontWeight: 700,
  marginBottom: 8,
};

const linkStyle: React.CSSProperties = {
  color: C.cyan,
  fontFamily: mono,
  fontSize: 12,
  textDecoration: "none",
};
