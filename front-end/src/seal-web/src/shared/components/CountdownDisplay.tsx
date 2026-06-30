import { C } from "@/shared/components/PixelComponents";
import { TimerStatus } from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

interface CountdownDisplayProps {
  remainingSeconds: number;
  status: TimerStatus;
  size?: "sm" | "md";
  icon?: boolean;
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownDisplay({ remainingSeconds, status, size = "md", icon = false }: CountdownDisplayProps) {
  const running = status === "RUNNING" && remainingSeconds > 0;
  const paused = status === "PAUSED";
  const color = running ? C.green : paused ? C.yellow : C.red;
  const fontSize = size === "sm" ? 11 : 13;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color,
        border: `1px solid ${running ? "rgba(34,197,94,0.35)" : paused ? "rgba(234,179,8,0.35)" : "rgba(239,68,68,0.35)"}`,
        background: running ? "rgba(34,197,94,0.08)" : paused ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)",
        padding: size === "sm" ? "4px 8px" : "6px 10px",
        fontFamily: mono,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {icon && <span aria-hidden>TIME</span>}
      {paused ? "PAUSED" : formatSeconds(remainingSeconds)}
    </span>
  );
}
