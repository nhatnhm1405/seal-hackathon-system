import { useEffect, useMemo, useState } from "react";
import { ApiError, RoundTimerState, TimerPhase, timersApi } from "@/shared/apiClient";

interface UseRoundTimerOptions {
  fireBanners?: boolean;
}

interface UseRoundTimerResult {
  isConfigured: boolean;
  isRunning: boolean;
  isPaused: boolean;
  status: RoundTimerState["status"];
  remainingSeconds: number;
  state: RoundTimerState | null;
  loading: boolean;
}

const EMPTY_TIMER: UseRoundTimerResult = {
  isConfigured: false,
  isRunning: false,
  isPaused: false,
  status: "IDLE",
  remainingSeconds: 0,
  state: null,
  loading: false,
};

export function useRoundTimer(
  eventId: number | null,
  roundId: number | null,
  phase: TimerPhase,
  _options: UseRoundTimerOptions = {},
): UseRoundTimerResult {
  const [state, setState] = useState<RoundTimerState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (eventId == null || roundId == null) {
      setState(null);
      setLoading(false);
      return;
    }

    const currentEventId = eventId;
    const currentRoundId = roundId;

    async function load() {
      setLoading(true);
      try {
        const response = await timersApi.get(currentEventId, currentRoundId, phase);
        if (!cancelled) setState(response.data ?? null);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setState(null);
          } else {
            setState(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [eventId, roundId, phase]);

  return useMemo(() => {
    if (!state) return { ...EMPTY_TIMER, loading };

    const remainingSeconds = Math.max(0, Math.floor(state.remainingSeconds ?? 0));

    return {
      isConfigured: state.status !== "IDLE",
      isRunning: state.status === "RUNNING" && remainingSeconds > 0,
      isPaused: state.status === "PAUSED",
      status: state.status,
      remainingSeconds,
      state,
      loading,
    };
  }, [state, loading]);
}
