import { useState } from "react";
import { C, PixelCard, PixelBadge, PixelButton, PixelInput, PixelProgress, PixelTabs, SectionHeader } from "@/shared/components/PixelComponents";

type Page = "landing" | "auth" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const events = [
  {
    id: 1, name: "SEAL Hack 2026", status: "active", teams: 120, maxTeams: 150,
    submissions: 98, startDate: "Jun 15, 2026", endDate: "Jun 17, 2026",
    prize: "$25,000", category: "General", tags: ["AI", "Web3", "DevTools"],
    desc: "The flagship 48-hour hackathon. Build anything that solves a real problem.",
  },
  {
    id: 2, name: "DevChallenge Q3", status: "upcoming", teams: 45, maxTeams: 100,
    submissions: 0, startDate: "Jul 01, 2026", endDate: "Jul 03, 2026",
    prize: "$15,000", category: "Dev Tools", tags: ["Tooling", "CLI", "Productivity"],
    desc: "Build the best developer tool. Focus on DX, performance, and innovation.",
  },
  {
    id: 3, name: "Crypto Clash 2026", status: "draft", teams: 0, maxTeams: 200,
    submissions: 0, startDate: "Aug 10, 2026", endDate: "Aug 12, 2026",
    prize: "$30,000", category: "Web3", tags: ["DeFi", "NFT", "Smart Contracts"],
    desc: "The largest Web3 hackathon on the platform. Build the decentralized future.",
  },
  {
    id: 4, name: "AI Sprint 2026", status: "ended", teams: 89, maxTeams: 100,
    submissions: 76, startDate: "May 01, 2026", endDate: "May 03, 2026",
    prize: "$20,000", category: "AI/ML", tags: ["LLM", "Computer Vision", "Agents"],
    desc: "Ended — final results published. Top 3 teams recognized.",
  },
];

function EventCard({ event, onNavigate }: { event: typeof events[0]; onNavigate: (page: Page) => void }) {
  const statusColor = event.status === "active" ? "green" : event.status === "upcoming" ? "yellow" : event.status === "draft" ? "gray" : "blue";
  return (
    <PixelCard glow={event.status === "active"} className="p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700 }}>{event.name}</div>
            <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 4 }}>
              {event.startDate} → {event.endDate}
            </div>
          </div>
          <PixelBadge color={statusColor as "green" | "yellow" | "gray" | "blue"}>● {event.status}</PixelBadge>
        </div>

        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.7 }}>{event.desc}</p>

        <div className="flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: "rgba(34,197,94,0.05)",
                border: `1px solid rgba(34,197,94,0.2)`,
                color: C.textMuted,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 0,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Prize", value: event.prize, color: "#facc15" },
            { label: "Teams", value: `${event.teams}/${event.maxTeams}`, color: C.green },
            { label: "Category", value: event.category, color: C.textMuted },
          ].map((s) => (
            <div key={s.label} style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: "center", background: C.surface2, padding: "8px 4px", border: `1px solid ${C.border}` }}>
              <div style={{ color: s.color, fontSize: 13, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <PixelProgress value={event.teams} max={event.maxTeams} label="Team capacity" showValue={false} />

        <div className="flex gap-2 mt-1">
          <PixelButton size="sm" onClick={() => onNavigate("teams")}>MANAGE</PixelButton>
          {event.status === "active" && (
            <PixelButton size="sm" variant="secondary" onClick={() => onNavigate("submissions")}>SUBMISSIONS</PixelButton>
          )}
          {event.status === "draft" && (
            <PixelButton size="sm" variant="secondary">PUBLISH</PixelButton>
          )}
        </div>
      </div>
    </PixelCard>
  );
}

export function EventsPage({ navigate }: { navigate: (page: Page) => void }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  const tabs = [
    { id: "all", label: "All Events" },
    { id: "active", label: "Active" },
    { id: "upcoming", label: "Upcoming" },
    { id: "draft", label: "Drafts" },
    { id: "ended", label: "Ended" },
  ];

  const filtered = events.filter((e) => {
    const matchesTab = activeTab === "all" || e.status === activeTab;
    const matchesSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700 }}>Events</h1>
        </div>
        <PixelButton onClick={() => setShowCreate(!showCreate)}>+ CREATE EVENT</PixelButton>
      </div>

      {/* Create event form */}
      {showCreate && (
        <PixelCard className="p-5 mb-6" glow>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PixelInput label="Event Name" placeholder="My Awesome Hackathon" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
            <PixelInput label="Prize Pool" placeholder="$10,000" prefix="$" />
            <PixelInput label="Start Date" type="date" />
            <PixelInput label="End Date" type="date" />
            <PixelInput label="Max Teams" placeholder="100" prefix="#" />
            <PixelInput label="Category" placeholder="General / AI / Web3 ..." />
          </div>
          <div className="flex gap-3 mt-4">
            <PixelButton>SAVE AS DRAFT</PixelButton>
            <PixelButton variant="secondary" onClick={() => setShowCreate(false)}>CANCEL</PixelButton>
          </div>
        </PixelCard>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <PixelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div style={{ marginLeft: "auto" }}>
          <PixelInput placeholder="search events..." value={search} onChange={(e) => setSearch(e.target.value)} prefix="⌕" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: events.length, color: C.text },
          { label: "Active", value: events.filter((e) => e.status === "active").length, color: C.green },
          { label: "Upcoming", value: events.filter((e) => e.status === "upcoming").length, color: "#facc15" },
          { label: "Ended", value: events.filter((e) => e.status === "ended").length, color: C.textMuted },
        ].map((s) => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: "12px 16px", fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Events grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>∅</div>
          No events found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} onNavigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
