import { useCallback, useEffect, useRef, useState } from "react";
import { timersApi, type RoundTimerState, type TimerPhase, type TimerStatus } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

const RESYNC_MS = 20_000;
const DEFAULT_MILESTONES = [30, 15, 5, 1];

export interface RoundTimerView {
  status: TimerStatus;
  remainingSeconds: number;
  durationSeconds: number;
  endsAt: string | null;
  isConfigured: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  loading: boolean;
  refetch: () => void;
}

interface UseRoundTimerOptions {
  fireBanners?: boolean;
  enabled?: boolean;
}

function phaseWord(phase: TimerPhase): string {
  return phase === "JUDGING" ? "scoring" : "submission";
}

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

  const skewRef = useRef(0);
  const stateRef = useRef<RoundTimerState | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const runKeyRef = useRef<string>("");
  const prevRemainingRef = useRef<number | null>(null);

  const applyState = useCallback((nextState: RoundTimerState) => {
    skewRef.current = (nextState.serverNow ? Date.parse(nextState.serverNow) : Date.now()) - Date.now();

    const runKey = `${nextState.status}|${nextState.startedAt ?? ""}`;
    if (runKey !== runKeyRef.current) {
      runKeyRef.current = runKey;
      firedRef.current = new Set();
      prevRemainingRef.current = null;
    }

    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const clearState = useCallback(() => {
    stateRef.current = null;
    setState(null);
    setRemaining(0);
    firedRef.current = new Set();
    prevRemainingRef.current = null;
  }, []);

  const refetch = useCallback(() => {
    if (!enabled) return;

    timersApi.get(eventId as number, roundId as number, phase)
      .then((response) => applyState(response.data))
      .catch(() => clearState());
  }, [enabled, eventId, roundId, phase, applyState, clearState]);

  useEffect(() => {
    if (!enabled) {
      clearState();
      setLoading(false);
      return;
    }

    let active = true;
    clearState();
    setLoading(true);

    timersApi.get(eventId as number, roundId as number, phase)
      .then((response) => {
        if (active) applyState(response.data);
      })
      .catch(() => {
        if (active) clearState();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const intervalId = window.setInterval(() => {
      timersApi.get(eventId as number, roundId as number, phase)
        .then((response) => {
          if (active) applyState(response.data);
        })
        .catch(() => {
          if (active) clearState();
        });
    }, RESYNC_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, eventId, roundId, phase, applyState, clearState]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const currentState = stateRef.current;

      if (!currentState) {
        setRemaining(0);
        return;
      }

      let nextRemaining: number;

      if (currentState.status === "RUNNING" && currentState.endsAt) {
        nextRemaining = Math.max(
          0,
          Math.round((Date.parse(currentState.endsAt) - (Date.now() + skewRef.current)) / 1000),
        );
      } else if (currentState.status === "PAUSED") {
        nextRemaining = Math.max(0, currentState.remainingSeconds ?? 0);
      } else {
        nextRemaining = 0;
      }

      setRemaining(nextRemaining);

      if (fireBanners && currentState.status === "RUNNING") {
        const previousRemaining = prevRemainingRef.current;

        if (previousRemaining != null) {
          const duration = currentState.durationSeconds ?? 0;
          const minutes = currentState.milestoneMinutes?.length
            ? currentState.milestoneMinutes
            : DEFAULT_MILESTONES;
          const word = phaseWord(phase);

          const marks: Array<{
            key: string;
            seconds: number;
            title: string;
            message: string;
            type: "info" | "warning";
          }> = [];

          for (const minute of minutes) {
            const seconds = minute * 60;
            if (seconds < duration) {
              marks.push({
                key: `REM_${minute}`,
                seconds,
                title: `${minute} min left`,
                message: `${minute} minutes left in the ${word} window.`,
                type: minute <= 5 ? "warning" : "info",
              });
            }
          }

          if ((currentState.notifyAtHalf ?? true) && duration > 0) {
            marks.push({
              key: "HALF",
              seconds: Math.floor(duration / 2),
              title: "Halfway point",
              message: `Half of the ${word} time has elapsed.`,
              type: "info",
            });
          }

          marks.push({
            key: "EXPIRED",
            seconds: 0,
            title: "Time's up",
}
