import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelProgress, TerminalWindow } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const toReview = [
  {
    id: "SUB-003", team: "Segfault Heroes", project: "K8s Oracle",
    tech: ["Go", "Kubernetes", "Prometheus"], submittedAt: "Jun 17, 10:22 UTC",
    desc: "Predictive autoscaling for Kubernetes using ML-based traffic forecasting. Features automated resource optimization and cost reduction.",
    github: "github.com/segfault/k8soracle",
    demo: "",
    criteria: [
      { name: "Innovation", max: 25, description: "Novelty and creativity of the solution" },
      { name: "Technical", max: 30, description: "Code quality, architecture, performance" },
      { name: "Design", max: 20, description: "UX/UI, presentation, documentation" },
      { name: "Impact", max: 25, description: "Real-world applicability and potential" },
    ],
  },
  {
    id: "SUB-004", team: "ByteBlasters", project: "TypeFlux",
    tech: ["TypeScript", "Vue 3", "Prisma"], submittedAt: "Jun 17, 14:58 UTC",
    desc: "A type-safe full-stack scaffolding tool that auto-generates REST APIs from TypeScript type definitions using Prisma and Vue.",
    github: "github.com/byteblasters/typeflux",
    demo: "typeflux.app",
    criteria: [
      { name: "Innovation", max: 25, description: "Novelty and creativity of the solution" },
      { name: "Technical", max: 30, description: "Code quality, architecture, performance" },
      { name: "Design", max: 20, description: "UX/UI, presentation, documentation" },
      { name: "Impact", max: 25, description: "Real-world applicability and potential" },
    ],
  },
];

const reviewed = [
  { id: "SUB-001", team: "Team Cipher", project: "CipherGuard AI", total: 92, scores: { Innovation: 23, Technical: 28, Design: 18, Impact: 23 } },
  { id: "SUB-002", team: "NullPntr", project: "RustLens", total: 88, scores: { Innovation: 22, Technical: 27, Design: 17, Impact: 22 } },
];

export function JudgePage({ navigate }: { navigate: (page: Page) => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const current = toReview[currentIdx];
  const totalScore = current?.criteria.reduce((sum, c) => sum + (scores[c.name] ?? 0), 0) ?? 0;
  const maxTotal = current?.criteria.reduce((sum, c) => sum + c.max, 0) ?? 100;

  const handleScore = (name: string, val: number) => {
    setScores((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted((prev) => [...prev, current.id]);
      if (currentIdx < toReview.length - 1) {
        setCurrentIdx((i) => i + 1);
        setScores({});
        setFeedback("");
      }
    }, 1500);
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>
            // judge_dashboard
          </div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Judge Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            <span style={{ color: C.green }}>{reviewed.length}</span> reviewed · <span style={{ color: "#facc15" }}>{toReview.length - submitted.length}</span> pending
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: queue */}
        <div>
          <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
            // review_queue
          </div>
          <div className="flex flex-col gap-3">
            {toReview.map((sub, i) => {
              const isDone = submitted.includes(sub.id);
              const isCurrent = i === currentIdx;
              return (
                <PixelCard
                  key={sub.id}
                  className="p-4"
                  glow={isCurrent}
                  onClick={() => !isDone && setCurrentIdx(i)}
                  style={{ opacity: isDone ? 0.5 : 1, cursor: isDone ? "default" : "pointer", borderColor: isCurrent ? C.green : C.border }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{sub.project}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>by {sub.team}</div>
                    </div>
                    <PixelBadge color={isDone ? "green" : isCurrent ? "yellow" : "gray"}>
                      {isDone ? "done" : isCurrent ? "active" : "queue"}
                    </PixelBadge>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {sub.tech.map((t) => (
                      <span key={t} style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, background: "rgba(34,197,94,0.05)", border: `1px solid ${C.border}`, padding: "1px 5px" }}>{t}</span>
                    ))}
                  </div>
                </PixelCard>
              );
            })}

            {/* Reviewed */}
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginTop: 8 }}>
              // completed
            </div>
            {reviewed.map((sub) => (
              <PixelCard key={sub.id} className="p-4" style={{ opacity: 0.6 }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{sub.project}</div>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>by {sub.team}</div>
                  </div>
                  <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>{sub.total}</span>
                </div>
              </PixelCard>
            ))}
          </div>
        </div>

        {/* Right: scoring interface */}
        <div className="xl:col-span-2">
          {current && !submitted.includes(current.id) ? (
            <div className="flex flex-col gap-5">
              {/* Project info */}
              <PixelCard className="p-5" glow>
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 4 }}>{current.id}</div>
                    <h2 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700 }}>{current.project}</h2>
                    <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 2 }}>
                      by <span style={{ color: C.green }}>@{current.team}</span> · {current.submittedAt}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {current.demo && <PixelButton size="sm" variant="secondary">DEMO</PixelButton>}
                    <PixelButton size="sm" variant="secondary">GITHUB</PixelButton>
                  </div>
                </div>

                <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
                  {current.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {current.tech.map((t) => <PixelBadge key={t} color="green">{t}</PixelBadge>)}
                </div>
              </PixelCard>

              {/* Scoring criteria */}
              <PixelCard className="p-5" glow>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16 }}>
                  // scoring_criteria
                </div>
                <div className="flex flex-col gap-5">
                  {current.criteria.map((c) => {
                    const val = scores[c.name] ?? 0;
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginLeft: 8 }}>
                              (max {c.max})
                            </span>
                          </div>
                          <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
                            {val}/{c.max}
                          </span>
                        </div>
                        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginBottom: 8 }}>
                          {c.description}
                        </p>
                        {/* Score slider */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <input
                            type="range"
                            min={0}
                            max={c.max}
                            value={val}
                            onChange={(e) => handleScore(c.name, parseInt(e.target.value))}
                            style={{ flex: 1, accentColor: C.green, cursor: "pointer" }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                          {Array.from({ length: c.max + 1 }, (_, j) => j).filter((j) => j % Math.ceil(c.max / 5) === 0 || j === c.max).map((preset) => (
                            <button
                              key={preset}
                              onClick={() => handleScore(c.name, preset)}
                              style={{
                                background: val === preset ? C.green : "transparent",
                                color: val === preset ? "#000" : C.textMuted,
                                border: `1px solid ${val === preset ? C.green : C.border}`,
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                padding: "2px 6px",
                                cursor: "pointer",
                                borderRadius: 0,
                                transition: "all 0.1s",
                              }}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total score display */}
                <div
                  style={{
                    marginTop: 20,
                    padding: "16px",
                    background: "rgba(34,197,94,0.05)",
                    border: `1px solid ${C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Total Score</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 900, textShadow: `0 0 20px rgba(34,197,94,0.6)` }}>
                      {totalScore}
                    </span>
                    <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>/{maxTotal}</span>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <PixelProgress value={totalScore} max={maxTotal} showValue={false} />
                </div>
              </PixelCard>

              {/* Feedback */}
              <PixelCard className="p-5">
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", marginBottom: 12 }}>
                  // judge_feedback
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Write constructive feedback for the team (optional)..."
                  rows={4}
                  style={{
                    width: "100%",
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    padding: "12px",
                    resize: "vertical",
                    outline: "none",
                    caretColor: C.green,
                    borderRadius: 0,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.green)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </PixelCard>

              {/* Submit */}
              <div className="flex gap-3">
                <PixelButton size="lg" onClick={handleSubmit} disabled={submitting || totalScore === 0}>
                  {submitting ? <span className="flex items-center gap-2"><span className="animate-spin">...</span> SUBMITTING...</span> : "SUBMIT SCORES"}
                </PixelButton>
                <PixelButton variant="ghost" size="lg" disabled={submitting}>SKIP</PixelButton>
              </div>
            </div>
          ) : (
            <PixelCard className="p-8" glow>
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 18, marginBottom: 16, color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>DONE</div>
                <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  All submissions reviewed!
                </div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 24 }}>
                  Your scores have been submitted. Check the leaderboard for updated rankings.
                </div>
                <PixelButton onClick={() => navigate("leaderboard")}>VIEW LEADERBOARD</PixelButton>
              </div>
            </PixelCard>
          )}
        </div>
      </div>
    </div>
  );
}
