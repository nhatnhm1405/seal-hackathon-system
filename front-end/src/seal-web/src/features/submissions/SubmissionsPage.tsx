import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelInput, PixelTable, PixelTabs, PixelProgress } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const submissions = [
  {
    id: "SUB-001", team: "Team Cipher", project: "CipherGuard AI", event: "SEAL Hack 2026",
    status: "reviewed", score: 92, submittedAt: "Jun 16, 23:41 UTC",
    tech: ["Python", "GPT-4", "React"], desc: "An AI-powered password manager with zero-knowledge architecture.",
    links: { github: "github.com/cipher/cipherguard", demo: "cipherguard.vercel.app" },
  },
  {
    id: "SUB-002", team: "NullPntr", project: "RustLens", event: "SEAL Hack 2026",
    status: "reviewed", score: 88, submittedAt: "Jun 17, 01:15 UTC",
    tech: ["Rust", "WASM", "Next.js"], desc: "A blazing-fast WebAssembly-powered code analysis tool built in Rust.",
    links: { github: "github.com/nullpntr/rustlens", demo: "rustlens.dev" },
  },
  {
    id: "SUB-003", team: "Segfault Heroes", project: "K8s Oracle", event: "SEAL Hack 2026",
    status: "pending", score: null, submittedAt: "Jun 17, 10:22 UTC",
    tech: ["Go", "Kubernetes", "Prometheus"], desc: "Predictive autoscaling for Kubernetes using ML-based traffic forecasting.",
    links: { github: "github.com/segfault/k8soracle", demo: "" },
  },
  {
    id: "SUB-004", team: "ByteBlasters", project: "TypeFlux", event: "SEAL Hack 2026",
    status: "pending", score: null, submittedAt: "Jun 17, 14:58 UTC",
    tech: ["TypeScript", "Vue 3", "Prisma"], desc: "A type-safe full-stack scaffolding tool with auto-generated APIs.",
    links: { github: "github.com/byteblasters/typeflux", demo: "typeflux.app" },
  },
  {
    id: "SUB-005", team: "404 Not Found", project: "DataPulse", event: "SEAL Hack 2026",
    status: "disqualified", score: null, submittedAt: "Jun 17, 23:59 UTC",
    tech: ["Python", "Spark", "Streamlit"], desc: "Real-time data pipeline monitoring with automated anomaly detection.",
    links: { github: "github.com/404/datapulse", demo: "" },
  },
];

function SubmissionCard({ sub, onReview }: { sub: typeof submissions[0]; onReview: () => void }) {
  const statusColor = sub.status === "reviewed" ? "green" : sub.status === "pending" ? "yellow" : "red";
  return (
    <PixelCard className="p-5" glow={sub.status === "reviewed"}>
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginBottom: 4 }}>
            {sub.id} · {sub.submittedAt}
          </div>
          <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>
            {sub.project}
          </div>
          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 2 }}>
            by <span style={{ color: C.green }}>@{sub.team}</span> · {sub.event}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PixelBadge color={statusColor as "green" | "yellow" | "red"}>{sub.status}</PixelBadge>
          {sub.score !== null && (
            <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, textShadow: `0 0 10px rgba(34,197,94,0.5)` }}>
              {sub.score}<span style={{ fontSize: 12, color: C.textMuted }}>/100</span>
            </span>
          )}
        </div>
      </div>

      <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7, marginBottom: 12 }}>
        {sub.desc}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {sub.tech.map((t) => (
          <PixelBadge key={t} color="green">{t}</PixelBadge>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        {sub.links.github && (
          <a
            href="#"
            style={{
              color: C.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = C.green)}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = C.textMuted)}
          >
            {sub.links.github}
          </a>
        )}
        {sub.links.demo && (
          <a
            href="#"
            style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textDecoration: "none" }}
            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = C.green)}
            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = C.textMuted)}
          >
            {sub.links.demo}
          </a>
        )}
        <div style={{ marginLeft: "auto" }}>
          {sub.status === "pending" ? (
            <PixelButton size="sm" onClick={onReview}>REVIEW NOW</PixelButton>
          ) : sub.status === "reviewed" ? (
            <PixelButton size="sm" variant="secondary">VIEW SCORES</PixelButton>
          ) : (
            <PixelButton size="sm" variant="ghost" disabled>DISQUALIFIED</PixelButton>
          )}
        </div>
      </div>
    </PixelCard>
  );
}

export function SubmissionsPage({ navigate }: { navigate: (page: Page) => void }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const tabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "reviewed", label: "Reviewed" },
    { id: "disqualified", label: "Disqualified" },
  ];

  const filtered = submissions.filter((s) => {
    const matchTab = activeTab === "all" || s.status === activeTab;
    const matchSearch = !search || s.project.toLowerCase().includes(search.toLowerCase()) || s.team.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadDone(true);
    }, 2000);
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Submissions</h1>
        </div>
        <PixelButton onClick={() => navigate("judge")}>JUDGE PANEL</PixelButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: submissions.length, color: C.text },
          { label: "Reviewed", value: submissions.filter((s) => s.status === "reviewed").length, color: C.green },
          { label: "Pending", value: submissions.filter((s) => s.status === "pending").length, color: "#facc15" },
          { label: "Avg Score", value: "90.0", color: C.green },
        ].map((s) => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Submit your own project */}
      <PixelCard className="p-5 mb-6" glow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <PixelInput label="Project Name" placeholder="My Awesome Project" />
          <PixelInput label="GitHub Repository" placeholder="github.com/you/project" />
          <PixelInput label="Live Demo URL" placeholder="myproject.vercel.app" />
          <PixelInput label="Tech Stack" placeholder="React, Node, Postgres..." />
        </div>
        {/* File upload zone */}
        <div
          style={{
            border: `2px dashed ${uploadDone ? C.green : C.border}`,
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            background: uploadDone ? "rgba(34,197,94,0.05)" : "transparent",
            marginBottom: 12,
            transition: "all 0.2s",
          }}
          onClick={!uploadDone ? handleUpload : undefined}
        >
          {uploading ? (
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              <span className="animate-spin inline-block mr-2">...</span>
              Uploading project files...
              <div style={{ marginTop: 8 }}>
                <PixelProgress value={65} max={100} showValue={false} />
              </div>
            </div>
          ) : uploadDone ? (
            <div style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              Project files uploaded successfully
            </div>
          ) : (
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 8, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>UPLOAD</div>
              Drop files here or click to upload
              <div style={{ fontSize: 10, marginTop: 4 }}>ZIP, PDF, images up to 50MB</div>
            </div>
          )}
        </div>
        <PixelButton fullWidth>SUBMIT PROJECT</PixelButton>
      </PixelCard>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <PixelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div style={{ marginLeft: "auto" }}>
          <PixelInput placeholder="search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Submission list */}
      <div className="flex flex-col gap-4">
        {filtered.map((sub) => (
          <SubmissionCard key={sub.id} sub={sub} onReview={() => navigate("judge")} />
        ))}
      </div>
    </div>
  );
}
