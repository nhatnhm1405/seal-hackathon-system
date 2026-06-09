import { useState } from "react";
import {
  C, GradientText, PixelCard, PixelButton, PixelBadge, PixelInput,
} from "@/shared/components/PixelComponents";
import {
  prizes as initialPrizes, teams, events, Prize,
} from "@/shared/mocks/mockData";

interface Award {
  award_id: number;
  prize_id: number;
  team_id: number;
}

export function CoordPrizesPage() {
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [awards, setAwards] = useState<Award[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pRank, setPRank] = useState(1);

  const [selPrize, setSelPrize] = useState<number>(0);
  const [selTeam, setSelTeam] = useState<number>(0);

  function addPrize() {
    if (!pName) return;
    setPrizes(prev => [...prev, {
      prize_id: Math.max(0, ...prev.map(p => p.prize_id)) + 1,
      event_id: events[0]?.event_id ?? 1,
      prize_name: pName, description: pDesc, rank_position: pRank,
    }]);
    setPName(""); setPDesc(""); setPRank(1);
    setShowAdd(false);
  }

  function awardPrize() {
    if (!selPrize || !selTeam) return;
    setAwards(prev => [...prev, {
      award_id: Math.max(0, ...prev.map(a => a.award_id), 0) + 1,
      prize_id: selPrize, team_id: selTeam,
    }]);
    setSelPrize(0); setSelTeam(0);
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800 }}>
            <GradientText>Prizes</GradientText>
          </h1>
        </div>
        <PixelButton variant="cyber" onClick={() => setShowAdd(!showAdd)}>ADD PRIZE</PixelButton>
      </div>

      {showAdd && (
        <PixelCard style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 100px auto", gap: 10, alignItems: "end" }}>
            <PixelInput label="Name" value={pName} onChange={(e) => setPName(e.target.value)} />
            <PixelInput label="Description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
            <PixelInput label="Rank" type="number" value={String(pRank)} onChange={(e) => setPRank(Number(e.target.value))} />
            <PixelButton variant="cyber" onClick={addPrize}>ADD</PixelButton>
          </div>
        </PixelCard>
      )}

      <PixelCard style={{ padding: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {prizes.map(p => (
            <div key={p.prize_id} style={{ padding: 12, background: C.surface2, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, marginTop: 2 }}>{p.description}</div>
              </div>
              {p.rank_position && <PixelBadge color="cyan">RANK #{p.rank_position}</PixelBadge>}
            </div>
          ))}
        </div>
      </PixelCard>

      <PixelCard glow gradient style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Prize</label>
            <select value={selPrize} onChange={(e) => setSelPrize(Number(e.target.value))} style={selectStyle}>
              <option value={0}>Select prize...</option>
              {prizes.map(p => <option key={p.prize_id} value={p.prize_id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: C.greenMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Team</label>
            <select value={selTeam} onChange={(e) => setSelTeam(Number(e.target.value))} style={selectStyle}>
              <option value={0}>Select team...</option>
              {teams.filter(t => t.status === 'APPROVED').map(t => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
            </select>
          </div>
          <PixelButton variant="cyber" onClick={awardPrize}>CONFIRM AWARD</PixelButton>
        </div>
      </PixelCard>

      <PixelCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                {["Prize", "Team", "Description"].map(h => (
                  <th key={h} style={{ color: C.green, fontSize: 10, letterSpacing: "0.12em", textAlign: "left", padding: "12px 14px", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {awards.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 20, color: C.textMuted, fontSize: 12, textAlign: "center" }}>No prizes awarded yet</td></tr>
              )}
              {awards.map((a, i) => {
                const p = prizes.find(pp => pp.prize_id === a.prize_id);
                const t = teams.find(tt => tt.team_id === a.team_id);
                return (
                  <tr key={a.award_id} style={{ borderBottom: `1px solid rgba(34,197,94,0.06)`, background: i % 2 === 0 ? C.surface : C.surface2 }}>
                    <td style={{ color: C.text, fontSize: 13, padding: "12px 14px" }}>{p?.name}</td>
                    <td style={{ color: C.cyan, fontSize: 13, padding: "12px 14px" }}>{t?.name}</td>
                    <td style={{ color: C.textMuted, fontSize: 12, padding: "12px 14px" }}>{p?.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  marginTop: 6,
  padding: "10px 12px",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  color: C.text,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  borderRadius: 0,
  outline: "none",
  width: "100%",
};
