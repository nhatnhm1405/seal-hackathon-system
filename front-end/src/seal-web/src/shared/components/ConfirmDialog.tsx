import { ReactNode } from "react";
import { C, PixelButton } from "@/shared/components/PixelComponents";

// Reusable confirmation pop-up, generalized from the account Approve/Reject
// modal (CoordAccountsPage.ApprovalModal) so every destructive / status-changing
// action shares the same look. Nothing happens unless the user clicks Confirm;
// clicking Cancel or the backdrop calls onClose only.

export type ConfirmVariant = "cyber" | "danger" | "secondary";

interface ConfirmDialogProps {
  // When false, renders nothing. Defaults to true so a parent can just
  // conditionally mount the component (`{target && <ConfirmDialog .../>}`).
  open?: boolean;
  title: string;
  message: ReactNode;
  // Extra controls rendered below the message (e.g. an optional reason field).
  children?: ReactNode;
  // Highlighted "cannot be undone" style note.
  warning?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  working?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function accentFor(variant: ConfirmVariant): string {
  if (variant === "danger") return "#ef4444";
  if (variant === "secondary") return "#3b82f6";
  return "#22c55e"; // cyber
}

export function ConfirmDialog({
  open = true,
  title,
  message,
  children,
  warning,
  confirmLabel,
  cancelLabel = "CANCEL",
  variant = "cyber",
  working = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null;
  const accent = accentFor(variant);

  return (
    <>
      {/* Backdrop — click to dismiss (no-op on the action) */}
      <div
        onClick={() => { if (!working) onClose(); }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 400, backdropFilter: "blur(2px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 401,
          width: "min(460px, calc(100vw - 32px))", background: C.surface, border: `1px solid ${accent}66`,
          boxShadow: `0 0 40px ${accent}22, 0 16px 48px rgba(0,0,0,0.4)`, padding: 32,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <h2 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 12, lineHeight: 1.2 }}>
          {title}
        </h2>
        <div style={{ color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.8, marginBottom: warning || children ? 16 : 24 }}>
          {message}
        </div>

        {warning && (
          <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.4)", color: "#eab308", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.7, padding: "10px 12px", marginBottom: 16 }}>
            ⚠ {warning}
          </div>
        )}

        {children && <div style={{ marginBottom: 16 }}>{children}</div>}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: C.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", marginBottom: 16 }}>
            ERROR: {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <PixelButton variant={variant} onClick={onConfirm} disabled={working}>
            {working ? "WORKING…" : confirmLabel}
          </PixelButton>
          <PixelButton variant="secondary" onClick={onClose} disabled={working}>{cancelLabel}</PixelButton>
        </div>
      </div>
    </>
  );
}
