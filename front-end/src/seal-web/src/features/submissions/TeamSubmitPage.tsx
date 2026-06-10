import { useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  C, GradientText, PixelCard, PixelButton, PixelInput, PixelBadge, PixelTabs,
} from "@/shared/components/PixelComponents";
import { rounds, submissions } from "@/shared/mocks/mockData";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function TeamSubmitPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("submit");

  if (!currentUser || !currentUser.is_leader || currentUser.team_id === null) {
    return (
      <div style={{ padding: 24 }}>
        <PixelCard style={{ padding: 24 }}>
          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
            You don't have a team.
          </p>
        </PixelCard>
      </div>
    );
  }

  const activeRound = rounds.find(r => r.status === 'ACTIVE') ?? rounds[1];
  const teamSubs = submissions.filter(s => s.team_id === currentUser.team_id);
  const currentSub = teamSubs.find(s => s.round_id === activeRound.round_id);

  const deadlinePassed = new Date(activeRound.submission_deadline).getTime() < new Date("2026-05-25").getTime();

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em" }}>
          // submit_project
        </div>
        <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
          <GradientText>Submit Project</GradientText>
        </h1>
      </div>

      <PixelTabs
        tabs={[
          { id: "submit", label: "Submit" },
          { id: "history", label: "History" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "submit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PixelCard glow style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700 }}>
                  {activeRound.round_name}
                </div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
                  Deadline: {fmtDate(activeRound.submission_deadline)}
                </div>
              </div>
              <PixelBadge color={activeRound.status === 'ACTIVE' ? 'green' : 'gray'}>
                {activeRound.status}
              </PixelBadge>
            </div>
          </PixelCard>

          {deadlinePassed && (
            <div style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.35)",
              color: C.red,
              padding: "14px 16px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              letterSpacing: "0.06em",
            }}>
              DEADLINE PASSED — Submission window is closed for this round.
            </div>
          )}

          <PixelCard style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PixelInput
                label="Repository URL"
                value={currentSub?.repo_url ?? ""}
                placeholder="github.com/your-team/project"
                disabled
              />
              <PixelInput
                label="Demo URL"
                value={currentSub?.demo_url ?? ""}
                placeholder="https://demo.example.com"
                disabled
              />
              <PixelInput
                label="Slide Deck URL"
                value={currentSub?.slide_url ?? ""}
                placeholder="slides.google.com/..."
                disabled
              />
              <div style={{ display: "flex", gap: 12 }}>
                <PixelButton disabled variant="secondary">SAVE DRAFT</PixelButton>
                <PixelButton disabled variant="cyber">SUBMIT FINAL</PixelButton>
              </div>
            </div>
          </PixelCard>
        </div>
      )}

      {activeTab === "history" && (
        <PixelCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                  {["Round", "Submitted At", "Repo", "Demo", "Slides", "Status"].map(h => (
                    <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 16px", fontWeight: 600, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamSubs.map((s, i) => {
                  const round = rounds.find(r => r.round_id === s.round_id);
                  return (
                    <tr key={s.submission_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                      <td style={{ color: C.text, fontSize: 13, padding: "12px 16px" }}>{round?.round_name}</td>
                      <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 16px" }}>{fmtDate(s.submitted_at)}</td>
                      <td style={{ color: C.blueBright, fontSize: 11, padding: "12px 16px" }}>{s.repo_url}</td>
                      <td style={{ color: C.blueBright, fontSize: 11, padding: "12px 16px" }}>{s.demo_url}</td>
                      <td style={{ color: C.blueBright, fontSize: 11, padding: "12px 16px" }}>{s.slide_url}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <PixelBadge color="green">SUBMITTED</PixelBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PixelCard>
      )}
    </div>
  );
}
