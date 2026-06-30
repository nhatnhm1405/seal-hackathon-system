import { createPortal } from "react-dom";
import { TeamHistoryEntry } from "@/shared/apiClient";

const mono = "'JetBrains Mono', monospace";

interface Props {
  entry: TeamHistoryEntry;
  recipientName: string;
  onClose: () => void;
}

export function CertificateModal({ entry, recipientName, onClose }: Props) {
  const prize = entry.prize;
  const title = prize ? "Certificate of Achievement" : "Certificate of Participation";
  const roleLabel = entry.myRole === "LEADER" ? "Team Leader" : "Member";
  const statement = prize
    ? `${recipientName} received ${prize.name} with ${entry.teamName} at ${entry.eventName}.`
    : `${recipientName} participated in ${entry.eventName} as ${roleLabel} of ${entry.teamName}.`;

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(920px, 96vw)", aspectRatio: "1.414 / 1", background: "#fbf8f0", color: "#1a1a1a", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", padding: "6% 9%", boxSizing: "border-box", textAlign: "center" }}
      >
        <div style={{ position: "absolute", inset: 18, border: "3px solid #1f6feb" }} />
        <div style={{ position: "absolute", inset: 28, border: "1px solid rgba(31,111,235,0.55)" }} />
        <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <div style={{ fontFamily: mono, letterSpacing: "0.26em", fontSize: 13, fontWeight: 800, color: "#1f6feb", textTransform: "uppercase" }}>
            SEAL Hackathon
          </div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 42, fontWeight: 800 }}>{title}</div>
          <div style={{ width: 120, height: 3, background: "#1f6feb" }} />
          <div style={{ fontFamily: "Georgia, serif", fontSize: 52, color: "#1f6feb", fontWeight: 700 }}>{recipientName}</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, lineHeight: 1.6, maxWidth: 720 }}>{statement}</div>
          <div style={{ marginTop: "auto", fontFamily: mono, fontSize: 12, color: "#555" }}>{new Date().toLocaleDateString()}</div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ position: "fixed", top: 20, right: 20, border: "1px solid #94a3b8", background: "transparent", color: "#e5e7eb", padding: "10px 14px", fontFamily: mono, cursor: "pointer" }}
      >
        CLOSE
      </button>
    </div>,
    document.body
  );
}
