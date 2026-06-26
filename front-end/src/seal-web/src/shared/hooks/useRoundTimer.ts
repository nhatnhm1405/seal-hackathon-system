import { useCallback, useEffect, useRef, useState } from "react";
import { timersApi, type RoundTimerState, type TimerPhase, type TimerStatus } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

// Re-sync with the server occasionally; in between, the countdown ticks locally
// from endsAt (corrected for clock skew). 20s keeps drift invisible without
// hammering the API.
const RESYNC_MS = 20_000;
const DEFAULT_MILESTONES = [30, 15, 5, 1];

export interface RoundTimerView {
  status: TimerStatus;
  remainingSeconds: number;
  durationSeconds: number;
  endsAt: string | null;
  isConfigured: boolean; // a timer exists for this round phase (status !== IDLE)
  isRunning: boolean;    // RUNNING with time left → writes allowed
  isPaused: boolean;
  isExpired: boolean;
  loading: boolean;
  refetch: () => void;
}

interface UseRoundTimerOptions {
  // Fire ephemeral milestone banners (30/15/5/1 min, 50%, time-up) for the
  // viewer. The persistent bell entry is handled server-side for participants/
  // judges; mentors use banners only.
  fireBanners?: boolean;
  enabled?: boolean;
}

// "what closes" wording for the banner copy.
function phaseWord(phase: TimerPhase): string {
  return phase === "JUDGING" ? "scoring" : "submission";
}

/**
 * Live, server-authoritative countdown for one round phase. Returns a view the
 * UI can render + gate on, and (optionally) fires precise milestone banners the
 * instant a mark is crossed while the page is open.
 */
export function useRoundTimer(
  eventId: number | null | undefined,
  roundId: number | null | undefined,
  phase: TimerPhase,
  options: UseRoundTimerOptions = {},
): RoundTimerView {
  const { addToast } = useNotifications();
  const fireBanners = options.fireBanners ?? false;
  const enabled = (options.enabled ?? true) && eventId != null && roundId != null;

  const [state, setState] = useState<RoundTimerState | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [remaining, setRemaining] = useState<number>(0);

  const skewRef = useRef(0);                       // serverNow - clientNow (ms)
  const stateRef = useRef<RoundTimerState | null>(null);
  const firedRef = useRef<Set<string>>(new Set()); // milestone keys fired this run
  const runKeyRef = useRef<string>("");            // detects a fresh run (startedAt change)
  const prevRemainingRef = useRef<number | null>(null);

  const applyState = useCallback((s: RoundTimerState) => {
    skewRef.current = (s.serverNow ? Date.parse(s.serverNow) : Date.now()) - Date.now();
    const runKey = `${s.status}|${s.startedAt ?? ""}`;
    if (runKey !== runKeyRef.current) {
      runKeyRef.current = runKey;
      firedRef.current = new Set();
      prevRemainingRef.current = null; // don't fire marks already passed on (re)load
    }
    stateRef.current = s;
    setState(s);
  }, []);

  const refetch = useCallback(() => {
    if (!enabled) return;
    timersApi.get(eventId as number, roundId as number, phase)
      .then(res => applyState(res.data))
      .catch(() => { /* keep last known state */ });
  }, [enabled, eventId, roundId, phase, applyState]);

  // Initial fetch + periodic re-sync.
  useEffect(() => {
    if (!enabled) {
      stateRef.current = null;
      setState(null);
      setRemaining(0);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    timersApi.get(eventId as number, roundId as number, phase)
      .then(res => { if (active) applyState(res.data); })
      .catch(() => { /* ignore */ })
      .finally(() => { if (active) setLoading(false); });

    const id = window.setInterval(() => {
      timersApi.get(eventId as number, roundId as number, phase)
        .then(res => { if (active) applyState(res.data); })
        .catch(() => { /* ignore */ });
    }, RESYNC_MS);

    return () => { active = false; window.clearInterval(id); };
  }, [enabled, eventId, roundId, phase, applyState]);

  // 1s tick: recompute remaining from endsAt, and detect milestone crossings.
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const s = stateRef.current;
      if (!s) { setRemaining(0); return; }

      let rem: number;
      if (s.status === "RUNNING" && s.endsAt) {
        rem = Math.max(0, Math.round((Date.parse(s.endsAt) - (Date.now() + skewRef.current)) / 1000));
      } else if (s.status === "PAUSED") {
        rem = Math.max(0, s.remainingSeconds ?? 0);
      } else {
        rem = 0;
      }
      setRemaining(rem);

      if (fireBanners && s.status === "RUNNING") {
        const prev = prevRemainingRef.current;
        if (prev != null) {
          const duration = s.durationSeconds ?? 0;
          const minutes = s.milestoneMinutes && s.milestoneMinutes.length ? s.milestoneMinutes : DEFAULT_MILESTONES;
          const word = phaseWord(phase);
          const marks: { key: string; t: number; title: string; msg: string; type: "info" | "warning" }[] = [];
          for (const m of minutes) {
            const t = m * 60;
            if (t < duration) {
              marks.push({ key: `REM_${m}`, t, title: `${m} min left`, msg: `${m} minutes left in the ${word} window.`, type: m <= 5 ? "warning" : "info" });
            }
          }
          if ((s.notifyAtHalf ?? true) && duration > 0) {
            marks.push({ key: "HALF", t: Math.floor(duration / 2), title: "Halfway point", msg: `Half of the ${word} time has elapsed.`, type: "info" });
          }
          marks.push({ key: "EXPIRED", t: 0, title: "Time's up", msg: `The ${word} window has closed.`, type: "warning" });

          for (const mk of marks) {
            if (prev > mk.t && rem <= mk.t && !firedRef.current.has(mk.key)) {
              firedRef.current.add(mk.key);
              addToast({ type: mk.type, title: mk.title, message: mk.msg });
            }
          }
        }
      }
      prevRemainingRef.current = rem;
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [enabled, state, fireBanners, phase, addToast]);

  const status: TimerStatus = state?.status ?? "IDLE";
  const isRunning = status === "RUNNING" && remaining > 0;
  return {
    status,
    remainingSeconds: remaining,
    durationSeconds: state?.durationSeconds ?? 0,
    endsAt: state?.endsAt ?? null,
    isConfigured: status !== "IDLE",
    isRunning,
    isPaused: status === "PAUSED",
    isExpired: status === "EXPIRED" || (status === "RUNNING" && remaining <= 0),
    loading,
    refetch,
  };
}
