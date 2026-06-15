import { useState, useEffect, useCallback } from "react";
import {
  C, GradientText, PixelBadge,
} from "@/shared/components/PixelComponents";
import {
  eventsApi, roundsApi, tracksApi, teamsApi, coordinatorApi, ApiError,
  HackathonEvent, Round, Track, UserItem, JudgeRosterItem, MentorRosterItem, Team,
} from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

// On-theme (dark cyber) tokens. Surfaces use the theme variables so the board
// matches the rest of the dashboard; accents are the project's green/cyan/amber.
const HEAD_BG = "rgba(34,197,94,0.14)";
const HEAD_BORDER = "rgba(34,197,94,0.40)";
const MENTOR_HEAD_BG = "rgba(59,130,246,0.16)";
const MENTOR_HEAD_BORDER = "rgba(59,130,246,0.45)";
const MENTOR_CELL_BG = "rgba(59,130,246,0.07)";
const MENTOR_TEXT = "#60a5fa";
const FINAL_BG = "rgba(234,179,8,0.10)";
const FINAL_BORDER = "rgba(234,179,8,0.45)";

const TRACK_COL = 230;
const CELL_COL = "minmax(220px, 1fr)";

function pickDefaultEvent(events: HackathonEvent[]): number | null {
  if (events.length === 0) return null;
  const active = events.find(e => e.status === 'IN_PROGRESS') ?? events.find(e => e.status === 'OPEN');
  return (active ?? events[events.length - 1]).eventId;
}

type Active =
  | { kind: 'mentor'; trackId: number }
  | { kind: 'judge'; roundId: number; trackId: number }
  | { kind: 'final'; roundId: number }
  | null;

export function CoordJudgesPage() {
  const [events, setEvents] = useState<HackathonEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [staff, setStaff] = useState<UserItem[]>([]);
  const [judges, setJudges] = useState<JudgeRosterItem[]>([]);
  const [mentors, setMentors] = useState<MentorRosterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [active, setActive] = useState<Active>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      eventsApi.getAll().then(r => r.data ?? []),
      coordinatorApi.getStaff().then(r => r.data ?? []).catch(() => [] as UserItem[]),
    ])
      .then(([evs, st]) => { setEvents(evs); setStaff(st); setSelectedEventId(pickDefaultEvent(evs)); })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : "Failed to load events."))
      .finally(() => setLoading(false));
  }, []);

  const reloadJudges = useCallback((eventId: number) =>
    coordinatorApi.getJudgeRoster(eventId).then(r => setJudges(r.data ?? [])).catch(() => setJudges([])), []);
  const reloadMentors = useCallback((eventId: number) =>
    coordinatorApi.getMentorRoster(eventId).then(r => setMentors(r.data ?? [])).catch(() => setMentors([])), []);

  useEffect(() => {
    if (selectedEventId == null) { setRounds([]); setTracks([]); setTeams([]); setJudges([]); setMentors([]); return; }
    setActionError(null); setActive(null);
    roundsApi.getAll(selectedEventId).then(r => setRounds(r.data ?? [])).catch(() => setRounds([]));
    tracksApi.getAll(selectedEventId).then(r => setTracks(r.data ?? [])).catch(() => setTracks([]));
    teamsApi.getByEvent(selectedEventId).then(r => setTeams(r.data ?? [])).catch(() => setTeams([]));
    reloadJudges(selectedEventId);
    reloadMentors(selectedEventId);
  }, [selectedEventId, reloadJudges, reloadMentors]);

  const prelimRounds = [...rounds].filter(r => !r.isFinal).sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));
  const finalRounds = [...rounds].filter(r => r.isFinal).sort((a, b) => (a.orderNumber ?? a.roundId) - (b.orderNumber ?? b.roundId));

  const mentorsOf = (trackId: number) => mentors.filter(m => m.trackId === trackId);
  const judgesOf = (roundId: number, trackId: number | null) =>
    judges.filter(j => j.roundId === roundId && (trackId == null ? j.trackId == null : j.trackId === trackId));
  const teamCountOf = (trackId: number) => teams.filter(t => t.trackId === trackId).length;

  function assignedUserIds(): Set<number> {
    if (!active) return new Set();
    if (active.kind === 'mentor') return new Set(mentorsOf(active.trackId).map(m => m.mentorUserId));
    if (active.kind === 'judge') return new Set(judgesOf(active.roundId, active.trackId).map(j => j.judgeUserId));
    return new Set(judgesOf(active.roundId, null).map(j => j.judgeUserId));
  }

  async function add(userId: number) {
    if (!active || selectedEventId == null) return;
    setBusy(true); setActionError(null);
    try {
      if (active.kind === 'mentor') { await coordinatorApi.assignMentor({ mentorUserId: userId, trackId: active.trackId }); await reloadMentors(selectedEventId); }
      else if (active.kind === 'judge') { await coordinatorApi.assignJudge({ judgeUserId: userId, roundId: active.roundId, trackId: active.trackId }); await reloadJudges(selectedEventId); }
      else { await coordinatorApi.assignJudge({ judgeUserId: userId, roundId: active.roundId, trackId: null }); await reloadJudges(selectedEventId); }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to assign.");
    } finally { setBusy(false); }
  }

  async function removeMentor(id: number) {
    setActionError(null);
    try { await coordinatorApi.removeMentorAssignment(id); setMentors(prev => prev.filter(m => m.id !== id)); }
    catch (err) { setActionError(err instanceof ApiError ? err.message : "Failed to remove."); }
  }
  async function removeJudge(id: number) {
    setActionError(null);
    try { await coordinatorApi.removeJudgeAssignment(id); setJudges(prev => prev.filter(j => j.id !== id)); }
    catch (err) { setActionError(err instanceof ApiError ? err.message : "Failed to remove."); }
  }

  const addedIds = assignedUserIds();
  const staffPool = staff.filter(u => query === "" || u.fullName.toLowerCase().includes(query.toLowerCase()) || (u.email ?? "").toLowerCase().includes(query.toLowerCase()));

  function Chip({ name, judgeType, onRemove }: { name: string; judgeType?: string; onRemove: () => void }) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.45)", borderRadius: 4, color: C.text, fontFamily: mono, fontSize: 12.5, fontWeight: 600, padding: "5px 8px 5px 10px", maxWidth: "100%" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        {judgeType && <span style={{ color: judgeType === 'GUEST' ? C.cyan : C.blueBright, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em" }}>{judgeType === 'GUEST' ? "GUEST" : "INT"}</span>}
        <button onClick={onRemove} title="Remove" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, lineHeight: 1, padding: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.red; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMuted; }}>✕</button>
      </span>
    );
  }

  function AddButton({ onClick, isActive }: { onClick: () => void; isActive: boolean }) {
    return (
      <button onClick={onClick}
        style={{ alignSelf: "flex-start", background: isActive ? "rgba(34,197,94,0.16)" : "transparent", border: `1px dashed ${isActive ? C.green : C.border}`, borderRadius: 4, color: isActive ? C.green : C.textMuted, fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "5px 11px", cursor: "pointer", transition: "color .12s, border-color .12s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.green; (e.currentTarget as HTMLElement).style.color = C.green; }}
        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.textMuted; } }}>
        + add
      </button>
    );
  }

  function AddPopover({ title }: { title: string }) {
    return (
      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 50, width: 280, background: C.surface2, border: `1px solid ${C.green}`, borderRadius: 4, boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, color: C.green, fontFamily: mono, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em" }}>
          Add to: {title}
        </div>
        <div style={{ padding: 9 }}>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="search staff…"
            style={{ width: "100%", boxSizing: "border-box", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: mono, fontSize: 12.5, padding: "8px 10px", outline: "none" }} />
        </div>
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          {staffPool.length === 0 && <div style={{ padding: "9px 13px", color: C.textMuted, fontFamily: mono, fontSize: 12 }}>No staff found.</div>}
          {staffPool.map(u => {
            const already = addedIds.has(u.userId);
            return (
              <div key={u.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.text, fontFamily: mono, fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fullName}</div>
                  <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 10 }}>{u.judgeType ?? "STAFF"}{u.email ? ` · ${u.email}` : ""}</div>
                </div>
                {already ? <span style={{ color: C.green, fontFamily: mono, fontSize: 11, fontWeight: 700 }}>✓ added</span>
                  : <button onClick={() => add(u.userId)} disabled={busy} style={{ background: "rgba(34,197,94,0.16)", border: `1px solid rgba(34,197,94,0.5)`, borderRadius: 4, color: C.green, fontFamily: mono, fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}>add +</button>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const cellBase: React.CSSProperties = { position: "relative", background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", minHeight: 80 };
  const headCell: React.CSSProperties = { background: HEAD_BG, border: `1px solid ${HEAD_BORDER}`, borderRadius: 4, padding: "11px 14px", fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: C.green, letterSpacing: "0.06em", display: "flex", flexDirection: "column", gap: 3, justifyContent: "center" };

  const gridCols = `${TRACK_COL}px ${TRACK_COL}px ${prelimRounds.map(() => CELL_COL).join(" ")}`;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 800 }}><GradientText>Assignments</GradientText></h1>
          <p style={{ color: C.textMuted, fontFamily: mono, fontSize: 12, marginTop: 4 }}>Mentor theo hạng mục · Judge theo vòng × hạng mục</p>
        </div>
        <div>
          <label style={{ color: C.greenMuted, fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Event</label>
          <select value={selectedEventId ?? 0} onChange={e => setSelectedEventId(Number(e.target.value) || null)}
            style={{ marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: mono, fontSize: 12, width: 240, display: "block", outline: "none" }}>
            {events.length === 0 && <option value={0}>No events</option>}
            {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
          </select>
        </div>
      </div>

      {loadError && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {loadError}</div>}
      {actionError && <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: mono, fontSize: 11, padding: "10px 14px" }}>ERROR: {actionError}</div>}

      {loading && <div style={{ color: C.textMuted, fontFamily: mono, fontSize: 12 }}>Loading…</div>}

      {!loading && tracks.length === 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 18, color: C.textMuted, fontFamily: mono, fontSize: 13 }}>
          This event has no tracks yet — create tracks &amp; rounds first.
        </div>
      )}

      {!loading && tracks.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 8, padding: 16, overflowX: "auto",
          boxShadow: "0 0 0 1px rgba(34,197,94,0.06), 0 10px 30px rgba(0,0,0,0.35)",
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.green}, ${C.blue}, transparent)`, opacity: 0.6, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8, minWidth: 820 }}>
            <div style={headCell}>TRACK</div>
            <div style={{ ...headCell, background: MENTOR_HEAD_BG, border: `1px solid ${MENTOR_HEAD_BORDER}`, color: MENTOR_TEXT }}>
              MENTORS<span style={{ fontWeight: 400, fontSize: 10, color: C.textMuted }}>per track · whole event</span>
            </div>
            {prelimRounds.map(r => (
              <div key={r.roundId} style={headCell}>
                {r.name}<span style={{ fontWeight: 400, fontSize: 10, color: C.textMuted }}>prelim · judges</span>
              </div>
            ))}

            {tracks.map(track => (
              <RowFragment key={track.trackId}
                track={track} teamCount={teamCountOf(track.trackId)} prelimRounds={prelimRounds}
                cellBase={cellBase} mentorCellBg={MENTOR_CELL_BG} mentorsOf={mentorsOf} judgesOf={judgesOf}
                active={active} setActive={(a) => { setActive(a); setQuery(""); }}
                Chip={Chip} AddButton={AddButton} AddPopover={AddPopover}
                removeMentor={removeMentor} removeJudge={removeJudge}
              />
            ))}
          </div>

          {finalRounds.map(fr => {
            const fJudges = judgesOf(fr.roundId, null);
            const isActive = active?.kind === 'final' && active.roundId === fr.roundId;
            return (
              <div key={fr.roundId} style={{ marginTop: 14, background: FINAL_BG, border: `1px solid ${FINAL_BORDER}`, borderRadius: 6, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ color: C.yellow, fontFamily: mono, fontSize: 13.5, fontWeight: 800, letterSpacing: "0.05em" }}>★ {fr.name} · FINAL</span>
                  <span style={{ color: C.textMuted, fontFamily: mono, fontSize: 11 }}>judges chấm tất cả hạng mục</span>
                  {fr.status && <PixelBadge color={["ACTIVE", "OPEN", "IN_PROGRESS"].includes((fr.status).toUpperCase()) ? "green" : "gray"}>{fr.status}</PixelBadge>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                  {fJudges.map(j => <Chip key={j.id} name={j.judgeName} judgeType={j.judgeType} onRemove={() => removeJudge(j.id)} />)}
                  <div style={{ position: "relative" }}>
                    <AddButton isActive={isActive} onClick={() => { setActive(isActive ? null : { kind: 'final', roundId: fr.roundId }); setQuery(""); }} />
                    {isActive && <AddPopover title={`${fr.name} · all tracks`} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {active && <div onClick={() => setActive(null)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />}
    </div>
  );
}

function RowFragment(props: {
  track: Track; teamCount: number; prelimRounds: Round[];
  cellBase: React.CSSProperties; mentorCellBg: string;
  mentorsOf: (trackId: number) => MentorRosterItem[];
  judgesOf: (roundId: number, trackId: number | null) => JudgeRosterItem[];
  active: Active; setActive: (a: Active) => void;
  Chip: (p: { name: string; judgeType?: string; onRemove: () => void }) => React.JSX.Element;
  AddButton: (p: { onClick: () => void; isActive: boolean }) => React.JSX.Element;
  AddPopover: (p: { title: string }) => React.JSX.Element;
  removeMentor: (id: number) => void; removeJudge: (id: number) => void;
}) {
  const { track, teamCount, prelimRounds, cellBase, mentorCellBg, mentorsOf, judgesOf, active, setActive, Chip, AddButton, AddPopover, removeMentor, removeJudge } = props;
  const mentorActive = active?.kind === 'mentor' && active.trackId === track.trackId;
  const trackMentors = mentorsOf(track.trackId);

  return (
    <>
      <div style={{ background: C.surface3, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.green}`, borderRadius: 4, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5, justifyContent: "center" }}>
        <span style={{ color: C.text, fontFamily: mono, fontSize: 14.5, fontWeight: 700 }}>{track.name}</span>
        <span style={{ color: C.cyan, fontFamily: mono, fontSize: 11, fontWeight: 600 }}>{teamCount} team{teamCount === 1 ? "" : "s"}</span>
      </div>

      <div style={{ ...cellBase, background: mentorCellBg }}>
        {trackMentors.map(m => <Chip key={m.id} name={m.mentorName} onRemove={() => removeMentor(m.id)} />)}
        <div style={{ position: "relative" }}>
          <AddButton isActive={mentorActive} onClick={() => setActive(mentorActive ? null : { kind: 'mentor', trackId: track.trackId })} />
          {mentorActive && <AddPopover title={`${track.name} · mentor`} />}
        </div>
      </div>

      {prelimRounds.map(r => {
        const cellJudges = judgesOf(r.roundId, track.trackId);
        const isActive = active?.kind === 'judge' && active.roundId === r.roundId && active.trackId === track.trackId;
        return (
          <div key={r.roundId} style={cellBase}>
            {cellJudges.map(j => <Chip key={j.id} name={j.judgeName} judgeType={j.judgeType} onRemove={() => removeJudge(j.id)} />)}
            <div style={{ position: "relative" }}>
              <AddButton isActive={isActive} onClick={() => setActive(isActive ? null : { kind: 'judge', roundId: r.roundId, trackId: track.trackId })} />
              {isActive && <AddPopover title={`${track.name} · ${r.name}`} />}
            </div>
          </div>
        );
      })}
    </>
  );
}
