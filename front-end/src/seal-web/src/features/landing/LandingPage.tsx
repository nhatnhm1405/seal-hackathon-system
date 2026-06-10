import { useState, useEffect } from "react";
import { useForceDark } from "@/app/providers/ThemeProvider";
import { useNavigate } from "react-router";
import {
  C, GradientText, PixelButton, PixelCard, PixelBadge,
  FloatingParticles, TerminalWindow, TypingText, SectionHeader, CircuitLines,
} from "@/shared/components/PixelComponents";
import { useAuth } from "@/app/providers/AuthProvider";
import { SealFooter } from "@/shared/components/SealFooter";
import sealLogo from "@/imports/image.png";
import Hero from "@/imports/Hero.jpg"
import G1 from "@/imports/Hackathon.jpg";
import G2 from "@/imports/Hackathon2.jpg";
import G3 from "@/imports/Hackathon3.jpg";
import G4 from "@/imports/Hackathon4.jpg";
import G5 from "@/imports/Hackathon5.jpg";
import G6 from "@/imports/Hackathon6.jpg";
import G7 from "@/imports/Hackathon7.jpg";

type Page = "landing" | "auth" | "register" | "dashboard" | "events" | "teams" | "submissions" | "leaderboard" | "judge" | "admin" | "profile";

const sponsors = [
  { name: "TechCorp", tier: "platinum" },
  { name: "DevHub", tier: "platinum" },
  { name: "CodeLab", tier: "gold" },
  { name: "ByteWave", tier: "gold" },
  { name: "SyncIO", tier: "silver" },
  { name: "NullPtr", tier: "silver" },
  { name: "OpenSrc", tier: "silver" },
];

const ongoingEvents = [
  {
    name: "SEAL Hack 2026",
    season: "SUMMER",
    track: "Open Track · AI/Web",
    deadline: "Submission deadline: Jun 17, 23:59 UTC",
    teams: 120,
    status: "active" as const,
    banner: "",
  },
  {
    name: "Spring Sprint",
    season: "SPRING",
    track: "Mobile & Embedded",
    deadline: "Judging in progress",
    teams: 54,
    status: "judging" as const,
    banner: ","
  },
];

const upcomingEvents = [
  {
    name: "DevChallenge Q3",
    season: "FALL",
    track: "DevOps & Cloud",
    opens: "Opens Jul 15, 2026",
    description: "48-hour sprint focused on cloud-native tooling and developer productivity.",
  },
  {
    name: "Crypto Clash",
    season: "FALL",
    track: "Web3 & Security",
    opens: "Opens Aug 01, 2026",
    description: "Build decentralised apps and security tooling in an intensive 36-hour window.",
  },
  {
    name: "Winter Code Jam",
    season: "FALL",
    track: "Open Track",
    opens: "Opens Dec 01, 2026",
    description: "End-of-year open-theme hackathon. Any stack, any idea, any team size.",
  },
];

const faqs = [
  { q: "Who can participate?", a: "Any student or developer 18+. Teams of 3-5 members. Students, professionals, and hobbyists are all welcome." },
  { q: "Is it free to join?", a: "Yes — participation is completely free. All you need is a registered account on this platform." },
  { q: "What can I build?", a: "Web apps, mobile apps, AI tools, dev tools, games — anything built from scratch during the hackathon window." },
  { q: "How are projects judged?", a: "Innovation, technical depth, design quality, and real-world impact — scored by a panel of expert judges per round." },
  { q: "What are the prizes?", a: "Cash prizes, cloud credits, hardware, mentorship sessions, and fast-track interviews at sponsor companies." },
  { q: "Can I use existing code?", a: "Open-source libraries and frameworks are fine. The core project must be built during the event." },
];

const features = [
  {
    title: "Team Registration",
    desc: "Form a team of up to 5, pick a track, and register in minutes. Invite members by email or share a join link.",
    accent: C.green,
  },
  {
    title: "Project Submission",
    desc: "Submit your GitHub repo, live demo URL, and slide deck before the deadline. Every submission is timestamped.",
    accent: C.blue,
  },
  {
    title: "Multi-Round Judging",
    desc: "Judges score on configurable criteria. Blind review prevents bias. Scores tally automatically — no spreadsheets.",
    accent: C.cyan,
  },
  {
    title: "Live Leaderboard",
    desc: "See where your team stands in real time. Rankings update the moment scores are submitted by judges.",
    accent: C.purple,
  },
  {
    title: "Event Management",
    desc: "Coordinators create events, define rounds and tracks, set deadlines, and manage participants from one dashboard.",
    accent: C.blue,
  },
  {
    title: "Announcements & Alerts",
    desc: "Receive real-time updates from coordinators. Deadline reminders, rule changes, and results — delivered instantly.",
    accent: C.green,
  },
];

const NAV_LINKS = [
  { label: "Home", href: "#hero" },
  { label: "Events", href: "#events" },
  { label: "Timeline", href: "#timeline" },
  { label: "Gallery", href: "#gallery" },
  { label: "About", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

function ImagePlaceholder({ label, dataPlaceholder, width, height, src = "" }: {
  label: string;
  dataPlaceholder: string;
  width?: string | number;
  height: string | number;
  src?: string;
}) {
  return (
    <div style={{ width: width ?? "100%", height, position: "relative", flexShrink: 0 }}>
      <img
        src={src}
        data-placeholder={dataPlaceholder}
        alt={label}
        style={{ display: src ? "block" : "none", width: "100%", height: "100%", objectFit: "cover" }}
      />
      {!src && (
        <div style={{
          position: "absolute", inset: 0,
          background: C.surface,
          border: "2px dashed rgba(34,197,94,0.35)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textAlign: "center", padding: "0 8px" }}>{label}</span>
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textAlign: "center" }}>→ replace src="" with your image path</span>
        </div>
      )}
    </div>
  );
}

function NavBar({ navigate }: { navigate: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const routerNavigate = useNavigate();

  function scrollTo(href: string) {
    if (href === "#hero") { window.scrollTo({ top: 0, behavior: "smooth" }); setOpen(false); return; }
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  }

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 60, overflow: "visible",
        background: "rgba(7,12,15,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(34,197,94,0.12)",
        boxShadow: "0 1px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.04)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: C.gradientPrimary, opacity: 0.6 }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "100%" }}>
        {/* LEFT — logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ height: 80, overflow: "visible", flexShrink: 0, display: "flex", alignItems: "center" }}>
            <img
              src={sealLogo}
              alt="SEAL"
              style={{ height: 160, width: "auto", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(34,197,94,0.35)) drop-shadow(0 0 16px rgba(59,130,246,0.2))" }}
            />
          </div>
          <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em" }}>
            <span style={{ background: C.gradientPrimary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              SEAL Hackathon
            </span>
          </span>
        </div>

        {/* CENTER — nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollTo(item.href)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.04em", textDecoration: "none", transition: "color 0.15s", padding: "4px 0", borderBottom: "2px solid transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.green; (e.currentTarget as HTMLElement).style.borderBottomColor = C.green; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.textMuted; (e.currentTarget as HTMLElement).style.borderBottomColor = "transparent"; }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* RIGHT — auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <PixelButton variant="cyber" size="sm" onClick={() => routerNavigate("/dashboard")}>Go to Dashboard</PixelButton>
          ) : (
            <>
              <PixelButton variant="ghost" size="sm" onClick={() => navigate("auth")}>Login</PixelButton>
              <PixelButton variant="cyber" size="sm" onClick={() => navigate("register")}>Register</PixelButton>
            </>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden"
          style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          {open ? "CLOSE" : "MENU"}
        </button>
      </div>

      {open && (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "16px 24px" }} className="md:hidden flex flex-col gap-4">
          {NAV_LINKS.map((item) => (
            <button key={item.label} onClick={() => scrollTo(item.href)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textAlign: "left" }}>
              {item.label}
            </button>
          ))}
          <div className="flex gap-3 mt-2">
            {isAuthenticated ? (
              <PixelButton variant="cyber" size="sm" onClick={() => routerNavigate("/dashboard")}>Go to Dashboard</PixelButton>
            ) : (
              <>
                <PixelButton variant="ghost" size="sm" onClick={() => navigate("auth")}>Login</PixelButton>
                <PixelButton variant="cyber" size="sm" onClick={() => navigate("register")}>Register</PixelButton>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroSection({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <section
      id="hero"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        paddingTop: 80,
        background: C.bg,
      }}
      className="cyber-grid-bg"
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "20%", right: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "5%", left: "40%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)", pointerEvents: "none", zIndex: 1 }} />

      <FloatingParticles count={32} className="z-0" />

      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 2 }}
        className="grid md:grid-cols-2 gap-12 items-center">

        <div className="flex flex-col gap-7">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.25)",
              padding: "5px 14px",
              borderRadius: 0,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 8px ${C.green}` }} className="cyber-pulse" />
              <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.15em" }}>LIVE · 2026 SEASON OPEN</span>
            </div>
          </div>

          <div>
            <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, lineHeight: 1.05, fontSize: "clamp(38px,5.5vw,68px)", letterSpacing: "-0.025em" }}>
              <GradientText from={C.green} to={C.blue}>Software</GradientText>
              <br />
              <GradientText from={C.blue} to={C.cyan}>Engineering</GradientText>
              <br />
              <span style={{ color: C.text }}>Agile League</span>
            </h1>
          </div>

          <div style={{ height: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>
            <span style={{ color: "rgba(134,239,172,0.4)" }}>$ </span>
            <TypingText
              phrases={["MANAGE_EVENTS.run()", "BUILD_TEAMS.execute()", "JUDGE_PROJECTS.eval()", "WIN_PRIZES.claim()"]}
              style={{ color: C.green }}
            />
          </div>

          <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, lineHeight: 1.8, maxWidth: 460 }}>
            The complete hackathon management platform. Register teams, submit projects, score entries, and track live leaderboards — all in one place.
          </p>

          <div className="flex flex-wrap gap-3">
            <PixelButton variant="cyber" size="lg" onClick={() => navigate("auth")}>GET STARTED FREE</PixelButton>
            <PixelButton variant="secondary" size="lg" onClick={() => navigate("register")}>EVENT REGISTRATION</PixelButton>
          </div>

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 4 }}>
            {[
              { v: "2,400+", l: "Hackers", c: C.green },
              { v: "320+", l: "Teams", c: C.blue },
              { v: "$50K", l: "Prizes", c: C.cyan },
              { v: "48h", l: "Sprint", c: C.green },
            ].map((s) => (
              <div key={s.l} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ color: s.c, fontSize: 22, fontWeight: 800, textShadow: `0 0 14px ${s.c}` }}>{s.v}</div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-4 relative">
          <CircuitLines className="absolute -top-8 -right-8 w-full max-w-sm" />

          <ImagePlaceholder label="[ HERO BANNER IMAGE ]" dataPlaceholder="hero-banner" height={220} src={Hero} />

          <TerminalWindow title="seal-hms — live-dashboard" className="pixel-float-slow relative z-10">
            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12, color: C.text }}>
              <div><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>auth</span> <span style={{ color: C.green }}>--login seal_admin</span></div>
              <div style={{ color: C.textMuted }}>  Authenticating... <span style={{ color: C.green }}>OK</span></div>

              <div className="mt-1"><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>events</span> <span style={{ color: C.blue }}>--list --active</span></div>
              <div style={{ color: C.textMuted, paddingLeft: 8 }}>
                <div>[1] SEAL Hack 2026 &nbsp;<PixelBadge color="green">active</PixelBadge></div>
                <div>[2] DevChallenge Q3 &nbsp;<PixelBadge color="yellow">upcoming</PixelBadge></div>
                <div>[3] Crypto Clash &nbsp;&nbsp;&nbsp;<PixelBadge color="gray">draft</PixelBadge></div>
              </div>

              <div className="mt-1"><span style={{ color: C.green }}>→</span> <span style={{ color: C.textMuted }}>leaderboard</span> <span style={{ color: C.cyan }}>--top 3</span></div>
              <div style={{ color: C.textMuted, paddingLeft: 8 }}>
                <div>#1 Team Cipher &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.green }}>9,240 pts</span></div>
                <div>#2 NullPntr &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: C.blue }}>8,815 pts</span></div>
                <div>#3 Segfault Heroes <span style={{ color: C.cyan }}>8,440 pts</span></div>
              </div>

              <div className="mt-1">
                <span style={{ color: C.green }}>→ </span>
                <span className="cursor-blink" style={{ color: C.green }} />
              </div>
            </div>
          </TerminalWindow>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Uptime", value: "99.97%", color: C.green },
              { label: "Active Teams", value: "120", color: C.blue },
              { label: "Submissions", value: "98", color: C.cyan },
              { label: "Avg Score", value: "88.4", color: C.purple },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  background: C.surface,
                  border: `1px solid ${m.color}22`,
                  padding: "10px 14px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `0 0 12px ${m.color}18`,
                }}
              >
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${m.color}, transparent)`, opacity: 0.5 }} />
                <div style={{ color: m.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800 }}>{m.value}</div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" style={{ background: C.bg, padding: "100px 0" }} className="cyber-grid-bg">
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader title="Everything You Need" gradient
          subtitle="A full-stack hackathon management platform. From team registration to final judging, SEAL handles every phase."
        />

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(59,130,246,0.4), transparent)", margin: "40px 0" }} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                border: `1px solid ${feat.accent}22`,
                padding: "24px",
                position: "relative",
                overflow: "hidden",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                boxShadow: `0 0 20px ${feat.accent}0a`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${feat.accent}25, 0 8px 24px rgba(0,0,0,0.4)`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.borderColor = `${feat.accent}44`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${feat.accent}0a`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.borderColor = `${feat.accent}22`;
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${feat.accent}, transparent)`, opacity: 0.7 }} />
              <div style={{ position: "absolute", bottom: -16, right: -16, width: 64, height: 64, borderRadius: "50%", background: `radial-gradient(circle, ${feat.accent}18, transparent 70%)`, pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${feat.accent}`, borderLeft: `2px solid ${feat.accent}`, opacity: 0.8 }} />

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ color: feat.accent, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>
                  {feat.title}
                </div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7 }}>
                  {feat.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventsSection() {
  const statusColors: Record<string, string> = { active: C.green, judging: C.cyan };
  const statusLabels: Record<string, string> = { active: "Active", judging: "Judging" };

  return (
    <section id="events" style={{ background: "#070b12", padding: "100px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader title="Events" gradient
          subtitle="Explore current hackathons in progress and upcoming opportunities to compete."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-16">
          {/* Ongoing Events */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 10px ${C.green}` }} className="cyber-pulse" />
              <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Ongoing</span>
            </div>
            <div className="flex flex-col gap-4">
              {ongoingEvents.map((ev) => (
                <div
                  key={ev.name}
                  style={{
                    background: C.surface,
                    border: `1px solid ${statusColors[ev.status]}33`,
                    padding: "20px 24px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: `0 0 20px ${statusColors[ev.status]}10`,
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${statusColors[ev.status]}, transparent)` }} />
                  <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${statusColors[ev.status]}`, borderLeft: `2px solid ${statusColors[ev.status]}` }} />
                  <div style={{ marginBottom: 16 }}>
                    <ImagePlaceholder label="[ EVENT BANNER IMAGE ]" dataPlaceholder={`event-banner-${ev.name.toLowerCase().replace(/\s+/g, '-')}`} height={120} src={G7} />
                  </div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}>{ev.name}</div>
                    <PixelBadge color={ev.status === "active" ? "green" : "cyan"}>{statusLabels[ev.status]}</PixelBadge>
                  </div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 8 }}>{ev.track}</div>
                  <div style={{ color: statusColors[ev.status], fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{ev.deadline}</div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>{ev.teams} teams registered</div>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ width: 8, height: 8, borderRadius: 0, background: C.blue, display: "inline-block", boxShadow: `0 0 10px ${C.blue}` }} />
              <span style={{ color: C.blue, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Coming Soon</span>
            </div>
            <div className="flex flex-col gap-4">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.name}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    padding: "20px 24px",
                    position: "relative",
                    overflow: "hidden",
                    opacity: 0.85,
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${C.blue}55`, borderLeft: `2px solid ${C.blue}55` }} />
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{ev.name}</div>
                    <PixelBadge color="blue">Upcoming</PixelBadge>
                  </div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginBottom: 6 }}>{ev.track}</div>
                  <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{ev.description}</div>
                  <div style={{ color: C.blue, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{ev.opens}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const timelineMilestones = [
  {
    label: "Registration Opens",
    date: "15.01.2026 — 09:00",
    desc: "Participant sign-ups and team formation portal goes live.",
    icon: "📅",
    status: "completed" as const,
  },
  {
    label: "Registration Closes",
    date: "28.02.2026 — 23:59",
    desc: "Final deadline to register your team and confirm track selection.",
    icon: "✏️",
    status: "completed" as const,
  },
  {
    label: "Preliminary Round",
    date: "15.03.2026 — 10:00",
    desc: "48-hour build sprint begins. All submissions timestamped on close.",
    icon: "⭐",
    status: "active" as const,
  },
  {
    label: "Scoring & Judging",
    date: "01.04.2026 — 09:00",
    desc: "Expert panel conducts blind review across all scoring criteria.",
    icon: "⚖️",
    status: "upcoming" as const,
  },
  {
    label: "Results Announced",
    date: "10.04.2026 — 18:00",
    desc: "Finalists and winners published on the live leaderboard.",
    icon: "📢",
    status: "upcoming" as const,
  },
  {
    label: "Award Ceremony",
    date: "20.04.2026 — 14:00",
    desc: "Live awards stream with prize distribution and sponsor spotlights.",
    icon: "🏆",
    status: "upcoming" as const,
  },
];

function TimelineSection() {
  const neon = "#00ff88";
  const neonDim = "rgba(0,255,136,0.18)";
  const neonGlow = "0 0 8px rgba(0,255,136,0.55), 0 0 20px rgba(0,255,136,0.25)";
  const bg = "#0a0a0a";
  const trackDim = "rgba(0,255,136,0.12)";

  return (
    <section
      id="timeline"
      style={{ background: bg, padding: "100px 0", borderTop: `1px solid ${neonDim}`, borderBottom: `1px solid ${neonDim}`, position: "relative", overflow: "hidden" }}
    >
      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", top: "20%", left: "5%", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle, rgba(0,255,136,0.04) 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,255,136,0.06)", border: `1px solid rgba(0,255,136,0.2)`, padding: "4px 14px", marginBottom: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: neon, display: "inline-block", boxShadow: neonGlow }} />
            <span style={{ color: neon, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em" }}>EVENT_TIMELINE</span>
          </div>
          <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 900, fontSize: "clamp(24px,3.5vw,42px)", lineHeight: 1.1, background: `linear-gradient(135deg, ${neon} 0%, #22c55e 60%, #3b82f6 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 12 }}>
            Hackathon Schedule
          </h2>
          <p style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.04em" }}>
            Key dates and milestones for the 2026 season
          </p>
        </div>

        {/* Horizontal stepper (desktop) */}
        <div className="hidden lg:block">
          {/* Track line */}
          <div style={{ position: "relative", marginBottom: 0 }}>
            <div style={{ position: "absolute", top: 28, left: "8.33%", right: "8.33%", height: 2, background: trackDim, zIndex: 0 }} />
            {/* Filled track up to active node */}
            <div style={{ position: "absolute", top: 28, left: "8.33%", width: "33.33%", height: 2, background: `linear-gradient(90deg, ${neon}, rgba(0,255,136,0.6))`, boxShadow: `0 0 8px rgba(0,255,136,0.5)`, zIndex: 1 }} />

            {/* Nodes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 0 }}>
              {timelineMilestones.map((m, i) => {
                const isCompleted = m.status === "completed";
                const isActive = m.status === "active";
                const isUpcoming = m.status === "upcoming";

                const nodeColor = isCompleted ? "#22c55e" : isActive ? neon : "rgba(255,255,255,0.15)";
                const nodeBorder = isCompleted ? "#22c55e" : isActive ? neon : "rgba(255,255,255,0.18)";
                const nodeBg = isCompleted ? "rgba(34,197,94,0.15)" : isActive ? "rgba(0,255,136,0.12)" : "#111";
                const nodeShadow = isActive ? neonGlow : isCompleted ? "0 0 8px rgba(34,197,94,0.4)" : "none";
                const labelColor = isCompleted ? "#4ade80" : isActive ? neon : "rgba(255,255,255,0.35)";
                const dateColor = isCompleted ? "rgba(74,222,128,0.5)" : isActive ? "rgba(0,255,136,0.6)" : "rgba(255,255,255,0.2)";
                const descColor = isCompleted ? "rgba(255,255,255,0.45)" : isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)";

                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 2, padding: "0 4px" }}>
                    {/* Node circle */}
                    <div style={{
                      width: 56, height: 56,
                      borderRadius: "50%",
                      background: nodeBg,
                      border: `2px solid ${nodeBorder}`,
                      boxShadow: nodeShadow,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isCompleted ? 18 : 20,
                      marginBottom: 16,
                      position: "relative",
                      flexShrink: 0,
                      transition: "box-shadow 0.2s",
                    }}>
                      {isCompleted ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span style={{ filter: isActive ? `drop-shadow(0 0 6px ${neon})` : "none" }}></span>
                      )}
                      {isActive && (
                        <div style={{ position: "absolute", inset: -4, borderRadius: "50%", border: `1px solid rgba(0,255,136,0.25)`, animation: "glowPulse 2s ease-in-out infinite", pointerEvents: "none" }} />
                      )}
                    </div>

                    {/* Label */}
                    <div style={{ color: labelColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center", marginBottom: 6, lineHeight: 1.3, textShadow: isActive ? `0 0 10px ${neon}` : "none" }}>
                      {m.label.toUpperCase()}
                    </div>

                    {/* Date */}
                    <div style={{ color: dateColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.04em", textAlign: "center", marginBottom: 6 }}>
                      {m.date}
                    </div>

                    {/* Description */}
                    <div style={{ color: descColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, lineHeight: 1.6, textAlign: "center", maxWidth: 140 }}>
                      {m.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Vertical stepper (mobile / tablet) */}
        <div className="lg:hidden" style={{ position: "relative", paddingLeft: 40 }}>
          {/* Vertical track */}
          <div style={{ position: "absolute", left: 20, top: 28, bottom: 28, width: 2, background: trackDim }} />
          {/* Filled portion */}
          <div style={{ position: "absolute", left: 20, top: 28, height: "33.33%", width: 2, background: `linear-gradient(180deg, ${neon}, rgba(0,255,136,0.5))`, boxShadow: `0 0 8px rgba(0,255,136,0.5)` }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {timelineMilestones.map((m, i) => {
              const isCompleted = m.status === "completed";
              const isActive = m.status === "active";

              const nodeColor = isCompleted ? "#22c55e" : isActive ? neon : "rgba(255,255,255,0.15)";
              const nodeBg = isCompleted ? "rgba(34,197,94,0.15)" : isActive ? "rgba(0,255,136,0.12)" : "#111";
              const nodeShadow = isActive ? neonGlow : isCompleted ? "0 0 8px rgba(34,197,94,0.4)" : "none";
              const labelColor = isCompleted ? "#4ade80" : isActive ? neon : "rgba(255,255,255,0.35)";
              const dateColor = isCompleted ? "rgba(74,222,128,0.5)" : isActive ? "rgba(0,255,136,0.6)" : "rgba(255,255,255,0.2)";
              const descColor = isCompleted ? "rgba(255,255,255,0.45)" : isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)";

              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 20, position: "relative", zIndex: 1 }}>
                  {/* Node */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: nodeBg,
                    border: `2px solid ${nodeColor}`,
                    boxShadow: nodeShadow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    marginLeft: -40,
                  }}>
                    {isCompleted ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: 14, filter: isActive ? `drop-shadow(0 0 4px ${neon})` : "none" }}>{m.icon}</span>
                    )}
                  </div>

                  <div>
                    <div style={{ color: labelColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4, textShadow: isActive ? `0 0 10px ${neon}` : "none" }}>
                      {m.label.toUpperCase()}
                    </div>
                    <div style={{ color: dateColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginBottom: 6 }}>
                      {m.date}
                    </div>
                    <div style={{ color: descColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6 }}>
                      {m.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const GALLERY = [
  { src: G1, idx: "01", borderColor: "#22c55e" },
  { src: G2, idx: "02", borderColor: "#3b82f6" },
  { src: G3, idx: "03", borderColor: "#06b6d4" },
  { src: G4, idx: "04", borderColor: "#3b82f6" },
  { src: G5, idx: "05", borderColor: "#22c55e" },
  { src: G6, idx: "06", borderColor: "#06b6d4" },
];

function GalleryPhoto({ src, idx, gridColumn, gridRow, borderColor = C.green, hovered, onMouseEnter, onMouseLeave, onClick }: {
  src: string; idx: string; gridColumn?: string; gridRow?: string;
  borderColor?: string; hovered: boolean; onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void;
}) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        gridColumn, gridRow, position: "relative", overflow: "hidden", cursor: "zoom-in",
        border: `1px solid ${hovered ? `${borderColor}88` : `${borderColor}28`}`,
        boxShadow: hovered
          ? `0 0 0 1px ${borderColor}22, 0 0 24px ${borderColor}44, 0 0 60px ${borderColor}18, inset 0 0 30px rgba(0,0,0,0.4)`
          : `0 0 12px ${borderColor}0a, inset 0 0 20px rgba(0,0,0,0.35)`,
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      <img src={src} alt={`Gallery ${idx}`} style={{
        width: "100%", height: "100%", objectFit: "cover", display: "block",
        transition: "transform 0.5s ease, filter 0.3s ease",
        transform: hovered ? "scale(1.06)" : "scale(1)",
        filter: hovered ? "brightness(1.08) contrast(1.05)" : "brightness(0.88) contrast(1)",
      }} />

      {/* Scanline overlay */}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 3px)", pointerEvents: "none", zIndex: 1 }} />

      {/* Gradient vignette */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 45%)", pointerEvents: "none", zIndex: 2 }} />

      {/* Hover colour wash */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3,
        background: hovered ? `linear-gradient(135deg, ${borderColor}14 0%, transparent 60%)` : "transparent",
        transition: "background 0.3s",
      }} />

      {/* Top edge neon line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 4,
        background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
        opacity: hovered ? 1 : 0.25,
        boxShadow: hovered ? `0 0 10px ${borderColor}, 0 0 20px ${borderColor}88` : "none",
        transition: "opacity 0.3s, box-shadow 0.3s",
      }} />

      {/* Bottom edge neon line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1, zIndex: 4,
        background: `linear-gradient(90deg, transparent, ${borderColor}66, transparent)`,
        opacity: hovered ? 0.8 : 0.12,
        transition: "opacity 0.3s",
      }} />

      {/* Index tag */}
      <div style={{
        position: "absolute", bottom: 10, right: 12, zIndex: 5,
        color: hovered ? borderColor : "rgba(255,255,255,0.22)",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em",
        textShadow: hovered ? `0 0 8px ${borderColor}, 0 0 16px ${borderColor}88` : "none",
        transition: "color 0.3s, text-shadow 0.3s",
      }}>
        /{idx}
      </div>

      {/* Corner brackets */}
      <div style={{
        position: "absolute", top: 7, left: 7, width: 16, height: 16, zIndex: 5,
        borderTop: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        borderLeft: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        boxShadow: hovered ? `inset 2px 2px 6px ${borderColor}33` : "none",
        transition: "border-color 0.3s, box-shadow 0.3s"
      }} />
      <div style={{
        position: "absolute", top: 7, right: 7, width: 16, height: 16, zIndex: 5,
        borderTop: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        borderRight: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        transition: "border-color 0.3s"
      }} />
      <div style={{
        position: "absolute", bottom: 7, left: 7, width: 16, height: 16, zIndex: 5,
        borderBottom: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        borderLeft: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        transition: "border-color 0.3s"
      }} />
      <div style={{
        position: "absolute", bottom: 7, right: 7, width: 16, height: 16, zIndex: 5,
        borderBottom: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        borderRight: `2px solid ${hovered ? borderColor : `${borderColor}44`}`,
        boxShadow: hovered ? `inset -2px -2px 6px ${borderColor}33` : "none",
        transition: "border-color 0.3s, box-shadow 0.3s"
      }} />
    </div>
  );
}

function GallerySection() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const n = GALLERY.length;

  useEffect(() => {
    if (activeIdx === null) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveIdx(null);
      if (e.key === "ArrowRight") setActiveIdx(i => i !== null ? (i + 1) % n : null);
      if (e.key === "ArrowLeft") setActiveIdx(i => i !== null ? (i + n - 1) % n : null);
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [activeIdx, n]);

  const h = (i: number) => ({
    hovered: hoveredIdx === i,
    onMouseEnter: () => setHoveredIdx(i),
    onMouseLeave: () => setHoveredIdx(null),
    onClick: () => setActiveIdx(i),
  });

  const navBtn = (label: string, action: () => void) => (
    <button
      onClick={(e) => { e.stopPropagation(); action(); }}
      style={{
        position: "absolute", top: "50%", transform: "translateY(-50%)",
        ...(label === "‹" ? { left: 16 } : { right: 16 }),
        background: "rgba(7,12,15,0.7)",
        border: "1px solid rgba(34,197,94,0.35)",
        color: "#22c55e",
        width: 48, height: 48,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", fontSize: 26, lineHeight: 1,
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all 0.18s",
        zIndex: 10,
      }}
      onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "rgba(34,197,94,0.14)"; el.style.boxShadow = "0 0 18px rgba(34,197,94,0.35)"; }}
      onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(7,12,15,0.7)"; el.style.boxShadow = "none"; }}
    >
      {label}
    </button>
  );

  return (
    <section id="gallery" style={{ background: "#060a10", padding: "100px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
      {/* Ambient glow blobs */}
      <div style={{ position: "absolute", top: "8%", left: "3%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(6,182,212,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
        <SectionHeader title="GALLERY" gradient subtitle="Past events, team moments, and ceremony highlights." />

        {/* Bento grid */}
        <div style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "220px 220px 210px",
          gap: 8,
          background: "rgba(34,197,94,0.03)",
          padding: 8,
          border: "1px solid rgba(34,197,94,0.07)",
          boxShadow: "0 0 80px rgba(34,197,94,0.04), 0 0 40px rgba(59,130,246,0.04)",
        }}>
          <GalleryPhoto {...GALLERY[0]} gridColumn="1 / 3" gridRow="1 / 3" {...h(0)} />
          <GalleryPhoto {...GALLERY[1]} gridColumn="3" gridRow="1"     {...h(1)} />
          <GalleryPhoto {...GALLERY[2]} gridColumn="3" gridRow="2"     {...h(2)} />
          <GalleryPhoto {...GALLERY[3]} gridColumn="1" gridRow="3"     {...h(3)} />
          <GalleryPhoto {...GALLERY[4]} gridColumn="2" gridRow="3"     {...h(4)} />
          <GalleryPhoto {...GALLERY[5]} gridColumn="3" gridRow="3"     {...h(5)} />
        </div>
      </div>

      {/* ── Lightbox ── */}
      {activeIdx !== null && (
        <div
          onClick={() => setActiveIdx(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.93)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }}
            style={{
              position: "absolute", top: 18, right: 20, zIndex: 11,
              background: "rgba(7,12,15,0.8)",
              border: "1px solid rgba(34,197,94,0.45)",
              color: "#22c55e",
              width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 22, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = "rgba(34,197,94,0.16)"; el.style.boxShadow = "0 0 20px rgba(34,197,94,0.4)"; el.style.borderColor = "#22c55e"; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = "rgba(7,12,15,0.8)"; el.style.boxShadow = "none"; el.style.borderColor = "rgba(34,197,94,0.45)"; }}
          >
            ×
          </button>

          {/* Prev / Next */}
          {navBtn("‹", () => setActiveIdx(i => i !== null ? (i + n - 1) % n : null))}
          {navBtn("›", () => setActiveIdx(i => i !== null ? (i + 1) % n : null))}

          {/* Image */}
          <img
            src={GALLERY[activeIdx].src}
            alt={`Gallery ${GALLERY[activeIdx].idx}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "88vw", maxHeight: "82vh",
              objectFit: "contain",
              border: `1px solid ${GALLERY[activeIdx].borderColor}55`,
              boxShadow: `0 0 60px ${GALLERY[activeIdx].borderColor}22, 0 0 120px rgba(0,0,0,0.8)`,
              userSelect: "none",
              display: "block",
            }}
          />

          {/* Dot pagination */}
          <div style={{
            position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 8, zIndex: 11,
          }}>
            {GALLERY.map((g, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                style={{
                  width: i === activeIdx ? 24 : 7, height: 7,
                  background: i === activeIdx ? GALLERY[activeIdx].borderColor : "rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  transition: "all 0.22s",
                  boxShadow: i === activeIdx ? `0 0 10px ${GALLERY[activeIdx].borderColor}` : "none",
                }}
              />
            ))}
          </div>

          {/* Counter */}
          <div style={{
            position: "absolute", top: 22, left: 20, zIndex: 11,
            color: "rgba(134,239,172,0.5)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.14em",
          }}>
            {String(activeIdx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </div>
        </div>
      )}
    </section>
  );
}

function SponsorsSection() {
  return (
    <section id="sponsors" style={{ background: C.bg, padding: "80px 0" }} className="cyber-grid-bg">
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader title="Our Sponsors" gradient subtitle="Backed by world-class tech companies who believe in developer talent." />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 48 }}>
          {sponsors.map((s) => {
            const isPlatinum = s.tier === "platinum";
            return (
              <div
                key={s.name}
                style={{
                  background: C.surface,
                  border: isPlatinum ? "1px solid rgba(34,197,94,0.3)" : `1px solid ${C.border}`,
                  padding: isPlatinum ? "14px 28px" : "10px 20px",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isPlatinum ? C.green : C.textMuted,
                  fontSize: isPlatinum ? 14 : 12,
                  fontWeight: isPlatinum ? 700 : 400,
                  boxShadow: isPlatinum ? `0 0 16px rgba(34,197,94,0.1), 0 0 30px rgba(59,130,246,0.06)` : "none",
                  transition: "all 0.2s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,130,246,0.4)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px rgba(59,130,246,0.15)`;
                  (e.currentTarget as HTMLElement).style.color = C.blueBright;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = isPlatinum ? "rgba(34,197,94,0.3)" : C.border;
                  (e.currentTarget as HTMLElement).style.boxShadow = isPlatinum ? `0 0 16px rgba(34,197,94,0.1)` : "none";
                  (e.currentTarget as HTMLElement).style.color = isPlatinum ? C.green : C.textMuted;
                }}
              >
                {isPlatinum && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: C.gradientPrimary, opacity: 0.5 }} />
                )}
                {s.name}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <span style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, letterSpacing: "0.04em" }}>
            Want to sponsor?{" "}
            <span style={{ color: C.blue, cursor: "pointer" }}>sponsors@seal-hms.io</span>
          </span>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section id="faq" style={{ background: "#070b12", padding: "100px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader title="Common Questions" gradient />
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 4 }}>
          {faqs.map((item, i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                border: `1px solid ${openIdx === i ? "rgba(59,130,246,0.3)" : C.border}`,
                transition: "border-color 0.2s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {openIdx === i && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: C.gradientPrimary, opacity: 0.6 }} />}
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <span style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, textAlign: "left" }}>
                  <span style={{ color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>Q: </span>{item.q}
                </span>
              </button>
              {openIdx === i && (
                <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${C.border}` }}>
                  <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.8, paddingTop: 12 }}>
                    <span style={{ color: C.blue, fontFamily: "'JetBrains Mono', monospace" }}>A: </span>{item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InnovationStrip() {
  const items = [
    { label: "Blockchain Verified", color: C.blue },
    { label: "Real-Time Analytics", color: C.green },
    { label: "Multi-Cloud Ready", color: C.cyan },
    { label: "Zero-Trust Security", color: C.blue },
    { label: "Live Sync Engine", color: C.cyan },
    { label: "DevOps Native", color: C.green },
  ];

  return (
    <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, overflow: "hidden", padding: "0" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #22c55e, #3b82f6, #06b6d4, transparent)" }} />
      <div style={{ padding: "20px 0", display: "flex", gap: 0 }}>
        <div style={{ display: "flex", gap: 0, animation: "dataFlow 16s linear infinite", whiteSpace: "nowrap" }}>
          {[...items, ...items].map((item, i) => (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 28px", borderRight: `1px solid ${C.border}` }}>
              <span style={{ color: item.color, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #3b82f6, #22c55e, #8b5cf6, transparent)" }} />
    </section>
  );
}

function CTASection({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <section
      style={{
        padding: "100px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        background: C.bg,
      }}
      className="cyber-grid-bg"
    >
      <FloatingParticles count={18} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(34,197,94,0.06) 0%, rgba(59,130,246,0.04) 50%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 580, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "clamp(28px,4vw,52px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 20, color: "white" }}>Boot Up Your<br /><GradientText from={C.green} to={C.blue}>Hackathon Journey</GradientText></h2>
        <p style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, lineHeight: 1.8, marginBottom: 36 }}>
          Join thousands of builders on the platform. Your next breakthrough starts with a single commit.
        </p>

        <div
          style={{
            background: "linear-gradient(#0d1117, #0d1117) padding-box, linear-gradient(135deg, #22c55e44, #3b82f644, #06b6d444) border-box",
            border: "1px solid transparent",
            padding: "28px",
            marginBottom: 24,
          }}
        >
          <div className="flex justify-center gap-3">
            <PixelButton variant="cyber" size="lg" onClick={() => navigate("register")}>GET STARTED FREE</PixelButton>
            <PixelButton variant="secondary" size="lg" onClick={() => navigate("register")}>EVENT REGISTRATION</PixelButton>
          </div>
          <p style={{ color: "rgba(134,239,172,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 16, letterSpacing: "0.04em" }}>
            No credit card required · Free forever · Open source
          </p>
        </div>
      </div>
    </section>
  );
}

export function LandingPage({ navigate }: { navigate: (p: Page) => void }) {
  useForceDark();
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <NavBar navigate={navigate} />
      <HeroSection navigate={navigate} />
      <InnovationStrip />
      <FeaturesSection />
      <EventsSection />
      <TimelineSection />
      <GallerySection />
      <SponsorsSection />
      <FAQSection />
      <CTASection navigate={navigate} />
      <SealFooter />
    </div>
  );
}
