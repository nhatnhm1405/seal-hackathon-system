import { useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput, PixelTabs,
} from "@/shared/components/PixelComponents";
import {
  events as initialEvents, tracks as initialTracks, rounds as initialRounds,
  criteria as initialCriteria, roundCriteria as initialRoundCriteria,
  HackathonEvent, Track, Round, ScoringCriteria, RoundCriteria,
} from "@/shared/mocks/mockData";

export function CoordEventsPage() {
  const [events, setEvents] = useState<HackathonEvent[]>(initialEvents);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(initialCriteria);
  const [roundCriteria, setRoundCriteria] = useState<RoundCriteria[]>(initialRoundCriteria);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(events[0]?.event_id ?? null);
  const [detailTab, setDetailTab] = useState<string>("tracks");

  // Create event form
  const [evName, setEvName] = useState("");
  const [evSeason, setEvSeason] = useState<'SPRING'|'SUMMER'|'FALL'>("SPRING");
  const [evStart, setEvStart] = useState("");
  const [evEnd, setEvEnd] = useState("");

  // Track form
  const [trkName, setTrkName] = useState("");
  const [trkDesc, setTrkDesc] = useState("");
  const [trkMax, setTrkMax] = useState(10);

  // Round form
  const [rdName, setRdName] = useState("");
  const [rdOrder, setRdOrder] = useState(1);
  const [rdDeadline, setRdDeadline] = useState("");
  const [rdTopN, setRdTopN] = useState<number>(3);

  // Criteria form
  const [crName, setCrName] = useState("");
  const [crDesc, setCrDesc] = useState("");
  const [crMax, setCrMax] = useState(10);
  const [crWeight, setCrWeight] = useState(1.0);

  const selectedEvent = selectedEventId ? events.find(e => e.event_id === selectedEventId) : null;

  function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evName) return;
    const ev: HackathonEvent = {
      event_id: Math.max(0, ...events.map(x => x.event_id)) + 1,
      event_name: evName, season: evSeason, start_date: evStart, end_date: evEnd, status: 'DRAFT',
    };
    setEvents(prev => [...prev, ev]);
    setEvName(""); setEvStart(""); setEvEnd("");
    setShowCreate(false);
  }

  function toggleEventStatus() {
    if (!selectedEvent) return;
    const next = selectedEvent.status === 'OPEN' ? 'CLOSED' : selectedEvent.status === 'CLOSED' ? 'OPEN' : 'OPEN';
    setEvents(prev => prev.map(e => e.event_id === selectedEvent.event_id ? { ...e, status: next } : e));
  }

  function addTrack() {
    if (!selectedEvent || !trkName) return;
    setTracks(prev => [...prev, {
      track_id: Math.max(0, ...prev.map(t => t.track_id)) + 1,
      event_id: selectedEvent.event_id,
      track_name: trkName, description: trkDesc, max_teams: trkMax,
    }]);
    setTrkName(""); setTrkDesc(""); setTrkMax(10);
  }

  function addRound() {
    if (!selectedEvent || !rdName) return;
    setRounds(prev => [...prev, {
      round_id: Math.max(0, ...prev.map(r => r.round_id)) + 1,
      event_id: selectedEvent.event_id,
      round_name: rdName, round_order: rdOrder, submission_deadline: rdDeadline, top_n_advance: rdTopN, status: 'UPCOMING',
    }]);
    setRdName(""); setRdDeadline("");
  }

  function changeRoundStatus(roundId: number, status: Round['status']) {
    setRounds(prev => prev.map(r => r.round_id === roundId ? { ...r, status } : r));
  }

  function addCriteria() {
    if (!crName) return;
    const newCrit: ScoringCriteria = {
      criteria_id: Math.max(0, ...criteria.map(c => c.criteria_id)) + 1,
      criteria_name: crName, description: crDesc, max_score: crMax, weight: crWeight,
    };
    setCriteria(prev => [...prev, newCrit]);
    setCrName(""); setCrDesc("");
  }

  const eventTracks = selectedEvent ? tracks.filter(t => t.event_id === selectedEvent.event_id) : [];
  const eventRounds = selectedEvent ? rounds.filter(r => r.event_id === selectedEvent.event_id).sort((a, b) => a.round_order - b.round_order) : [];

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Events</GradientText>
          </h1>
        </div>
        <PixelButton variant="cyber" onClick={() => setShowCreate(!showCreate)}>CREATE EVENT</PixelButton>
      </div>

      {showCreate && (
        <PixelCard style={{ padding: 20 }}>
          <form onSubmit={addEvent} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <PixelInput label="Event Name" value={evName} onChange={(e) => setEvName(e.target.value)} placeholder="SEAL Fall 2026" />
            <div>
              <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Season</label>
              <select value={evSeason} onChange={(e) => setEvSeason(e.target.value as 'SPRING'|'SUMMER'|'FALL')} style={{ width: "100%", marginTop: 6, padding: "10px 12px", background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 0, outline: "none" }}>
                <option value="SPRING">Spring</option>
                <option value="SUMMER">Summer</option>
                <option value="FALL">Fall</option>
              </select>
            </div>
            <PixelInput label="Start Date" type="date" value={evStart} onChange={(e) => setEvStart(e.target.value)} />
            <PixelInput label="End Date" type="date" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} />
            <div style={{ gridColumn: "1 / -1" }}>
              <PixelButton type="submit" variant="cyber">ADD EVENT</PixelButton>
            </div>
          </form>
        </PixelCard>
      )}

      {/* Events list */}
      <PixelCard style={{ padding: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map(ev => {
            const active = selectedEventId === ev.event_id;
            return (
              <button key={ev.event_id} onClick={() => setSelectedEventId(ev.event_id)}
                style={{
                  padding: "12px 14px",
                  background: active ? "rgba(34,197,94,0.1)" : C.surface2,
                  border: active ? `1px solid ${C.green}` : `1px solid ${C.border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontFamily: "'JetBrains Mono', monospace", color: C.text,
                  cursor: "pointer", borderRadius: 0, textAlign: "left",
                }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{ev.event_name}</div>
                  <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{ev.season} · {ev.start_date} → {ev.end_date}</div>
                </div>
                <PixelBadge color={ev.status === 'OPEN' ? 'green' : ev.status === 'CLOSED' ? 'red' : 'gray'}>{ev.status}</PixelBadge>
              </button>
            );
          })}
        </div>
      </PixelCard>

      {/* Detail panel */}
      {selectedEvent && (
        <PixelCard glow gradient style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                {selectedEvent.event_name}
              </div>
              <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 4 }}>
                {selectedEvent.season} · {selectedEvent.start_date} → {selectedEvent.end_date}
              </div>
            </div>
            <PixelButton variant="cyber" onClick={toggleEventStatus}>
              {selectedEvent.status === 'OPEN' ? 'CLOSE EVENT' : 'OPEN EVENT'}
            </PixelButton>
          </div>

          <PixelTabs
            tabs={[
              { id: "tracks", label: "Tracks" },
              { id: "rounds", label: "Rounds" },
              { id: "criteria", label: "Criteria" },
            ]}
            active={detailTab}
            onChange={setDetailTab}
          />

          <div style={{ marginTop: 16 }}>
            {detailTab === "tracks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {eventTracks.map(t => (
                  <div key={t.track_id} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{t.track_name}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>{t.description}</div>
                    </div>
                    <PixelBadge color="cyan">MAX {t.max_teams}</PixelBadge>
                  </div>
                ))}
                <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 100px auto", gap: 10, alignItems: "end" }}>
                    <PixelInput label="Name" value={trkName} onChange={(e) => setTrkName(e.target.value)} placeholder="Track name" />
                    <PixelInput label="Description" value={trkDesc} onChange={(e) => setTrkDesc(e.target.value)} placeholder="What is this track about?" />
                    <PixelInput label="Max Teams" type="number" value={String(trkMax)} onChange={(e) => setTrkMax(Number(e.target.value))} />
                    <PixelButton variant="secondary" onClick={addTrack}>ADD</PixelButton>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "rounds" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {eventRounds.map(r => (
                  <div key={r.round_id} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{r.round_order}. {r.round_name}</div>
                      <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>Deadline: {r.submission_deadline}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <PixelBadge color={r.status === 'ACTIVE' ? 'green' : r.status === 'UPCOMING' ? 'yellow' : 'red'}>{r.status}</PixelBadge>
                      {r.status === 'UPCOMING' && <PixelButton size="sm" variant="secondary" onClick={() => changeRoundStatus(r.round_id, 'ACTIVE')}>ACTIVATE</PixelButton>}
                      {r.status === 'ACTIVE' && <PixelButton size="sm" variant="danger" onClick={() => changeRoundStatus(r.round_id, 'CLOSED')}>CLOSE</PixelButton>}
                    </div>
                  </div>
                ))}
                <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 1fr 80px auto", gap: 10, alignItems: "end" }}>
                    <PixelInput label="Name" value={rdName} onChange={(e) => setRdName(e.target.value)} />
                    <PixelInput label="Order" type="number" value={String(rdOrder)} onChange={(e) => setRdOrder(Number(e.target.value))} />
                    <PixelInput label="Deadline" type="datetime-local" value={rdDeadline} onChange={(e) => setRdDeadline(e.target.value)} />
                    <PixelInput label="Top N" type="number" value={String(rdTopN)} onChange={(e) => setRdTopN(Number(e.target.value))} />
                    <PixelButton variant="secondary" onClick={addRound}>ADD</PixelButton>
                  </div>
                </div>
              </div>
            )}

            {detailTab === "criteria" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {criteria.map(c => {
                  const usedInRounds = roundCriteria.filter(rc => rc.criteria_id === c.criteria_id).map(rc => {
                    const r = rounds.find(rr => rr.round_id === rc.round_id);
                    return r?.round_name;
                  }).filter(Boolean);
                  return (
                    <div key={c.criteria_id} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{c.criteria_name}</div>
                          <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 2 }}>{c.description}</div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <PixelBadge color="cyan">MAX {c.max_score}</PixelBadge>
                          <PixelBadge color="blue">W {c.weight}</PixelBadge>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                        used in: {usedInRounds.join(", ") || "—"}
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px 80px auto", gap: 10, alignItems: "end" }}>
                    <PixelInput label="Name" value={crName} onChange={(e) => setCrName(e.target.value)} />
                    <PixelInput label="Description" value={crDesc} onChange={(e) => setCrDesc(e.target.value)} />
                    <PixelInput label="Max" type="number" value={String(crMax)} onChange={(e) => setCrMax(Number(e.target.value))} />
                    <PixelInput label="Weight" type="number" value={String(crWeight)} onChange={(e) => setCrWeight(Number(e.target.value))} />
                    <PixelButton variant="secondary" onClick={addCriteria}>ADD</PixelButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </PixelCard>
      )}
    </div>
  );
}
