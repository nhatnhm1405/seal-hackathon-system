import { useState } from "react";
import { C, PixelButton, PixelCard } from "@/shared/components/PixelComponents";
import { CountdownDisplay } from "@/shared/components/CountdownDisplay";
import { WheelTimePicker } from "@/shared/components/WheelTimePicker";
import { useRoundTimer } from "@/shared/hooks/useRoundTimer";
import { timersApi, apiErrorMessage, type TimerPhase, type RoundTimerState } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

// Coordinator control for a round's two countdowns:
//   CONTEST → submission window (participants)   ·   JUDGING → scoring window (judges)
// Option B: each is configured + started here, independently, AFTER the đề is
// released. Time is server-authoritative; this panel just drives the API and
// reflects the live state from useRoundTimer.
const MONO = "'JetBrains Mono', monospace";
const MIN_DURATION = 30; // mirrors backend MIN_DURATION_SECONDS

const PHASES: { phase: TimerPhase; title: string; blurb: string }[] = [
  { phase: "CONTEST", title: "Contest — Submission window", blurb: "While running, teams can submit. Ends → submissions are locked." },
  { phase: "JUDGING", title: "Judging — Scoring window", blurb: "While running, judges can score. Ends → scoring is locked." },
];

export function ContestTimerPanel({ eventId, roundId }: { eventId: number; roundId: number | null }) {
  if (roundId == null) {
    return (
      <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 12 }}>
        Select a round above to configure its timers.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {PHASES.map(p => (
        <PhaseTimerControl key={p.phase} eventId={eventId} roundId={roundId} phase={p.phase} title={p.title} blurb={p.blurb} />
      ))}
    </div>
  );
}

function PhaseTimerControl({
  eventId, roundId, phase, title, blurb,
}: {
  eventId: number;
  roundId: number;
  phase: TimerPhase;
  title: string;
  blurb: string;
}) {
  const { addToast } = useNotifications();
  const timer = useRoundTimer(eventId, roundId, phase, { fireBanners: false });
  const [durationSec, setDurationSec] = useState(30 * 60);
  const [extendSec, setExtendSec] = useState(5 * 60);
  const [showExtend, setShowExtend] = useState(false);
  const [busy, setBusy] = useState(false);

  const idle = !timer.isConfigured || timer.status === "STOPPED" || timer.status === "EXPIRED";

  async function run(action: () => Promise<{ data: RoundTimerState }>, okTitle: string, okMsg: string) {
    setBusy(true);
    try {
      await action();
      timer.refetch();
      addToast({ type: "success", title: okTitle, message: okMsg });
    } catch (err) {
      addToast({ type: "warning", title: "TIMER ACTION FAILED", message: apiErrorMessage(err, "Could not update the timer.") });
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    run(() => timersApi.start(eventId, roundId, phase, { durationSeconds: durationSec }), "TIMER STARTED", `${title} is now running.`);
  const pause = () => run(() => timersApi.pause(eventId, roundId, phase), "TIMER PAUSED", "The countdown is frozen.");
  const resume = () => run(() => timersApi.resume(eventId, roundId, phase), "TIMER RESUMED", "The countdown is running again.");
  const stop = () => run(() => timersApi.stop(eventId, roundId, phase), "TIMER STOPPED", "The window is now closed.");
  const extend = (sec: number) =>
    run(() => timersApi.extend(eventId, roundId, phase, sec), "TIME EXTENDED", `Added ${Math.round(sec / 60)} min.`);

  return (
    <PixelCard style={{ padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header: title + live read-out */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: C.text, fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{title}</div>
            <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 11, marginTop: 2 }}>{blurb}</div>
          </div>
          <CountdownDisplay remainingSeconds={timer.remainingSeconds} status={timer.status} />
        </div>

        {/* Controls */}
        {idle ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <WheelTimePicker valueSeconds={durationSec} onChange={setDurationSec} maxHours={99} disabled={busy} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <PixelButton variant="cyber" disabled={busy || durationSec < MIN_DURATION} onClick={start}>
                {timer.status === "STOPPED" || timer.status === "EXPIRED" ? "START AGAIN" : "START"}
              </PixelButton>
              {durationSec < MIN_DURATION && (
                <span style={{ color: C.yellow, fontFamily: MONO, fontSize: 11 }}>Minimum {MIN_DURATION}s.</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {timer.status === "PAUSED" ? (
                <PixelButton size="sm" variant="cyber" disabled={busy} onClick={resume}>RESUME</PixelButton>
              ) : (
                <PixelButton size="sm" variant="secondary" disabled={busy} onClick={pause}>PAUSE</PixelButton>
              )}
              <PixelButton size="sm" variant="secondary" disabled={busy} onClick={() => extend(5 * 60)}>+5 MIN</PixelButton>
              <PixelButton size="sm" variant="ghost" disabled={busy} onClick={() => setShowExtend(v => !v)}>EXTEND…</PixelButton>
              <PixelButton size="sm" variant="danger" disabled={busy} onClick={stop}>STOP</PixelButton>
            </div>
            {showExtend && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <WheelTimePicker valueSeconds={extendSec} onChange={setExtendSec} maxHours={12} disabled={busy} />
                <PixelButton size="sm" variant="cyber" disabled={busy || extendSec <= 0}
                  onClick={() => { extend(extendSec); setShowExtend(false); }}>
                  ADD TIME
                </PixelButton>
              </div>
            )}
          </div>
        )}
      </div>
    </PixelCard>
  );
}
