import { useEffect, useRef, useState } from "react";
import { C, PixelButton, PixelBadge } from "@/shared/components/PixelComponents";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { problemsApi, apiErrorMessage, type TrackProblem } from "@/shared/apiClient";
import { useNotifications } from "@/app/providers/NotificationProvider";

// "Đề thi" (problem statement) management for a Coordinator, rendered in its own
// "Problems" tab. TrackProblemsTab owns the per-track list (loaded via the bulk
// endpoint) so a single RELEASE ALL / RETRACT ALL can act on every track at once
// — releasing all tracks together keeps it fair across teams. TrackProblemPanel is
// a controlled row: it takes its problem from props and reports changes upward.
const MONO = "'JetBrains Mono', monospace";
const ACCEPT = ".pdf,.doc,.docx,.zip";

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Container: the whole Problems tab ───────────────────────────────────────
// `canRelease` is narrower than `canManage`: a problem can be uploaded/replaced/removed
// during SETUP, but only RELEASED ("phát đề") once the event has STARTED (IN_PROGRESS),
// matching the backend gate. Retract stays available whenever something is released.
export function TrackProblemsTab({ eventId, canManage, canRelease }: { eventId: number; canManage: boolean; canRelease: boolean }) {
  const { addToast } = useNotifications();
  const [items, setItems] = useState<TrackProblem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "release" | "retract">(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    problemsApi.listForEvent(eventId)
      .then(res => { if (active) setItems(res.data ?? []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId]);

  function patch(updated: TrackProblem) {
    setItems(prev => prev?.map(it => it.trackId === updated.trackId ? updated : it) ?? prev);
  }
  function clearProblem(trackId: number) {
    setItems(prev => prev?.map(it => it.trackId === trackId
      ? { ...it, hasProblem: false, released: false, fileName: null, fileSize: null } : it) ?? prev);
  }

  const tracks = items ?? [];
  const total = tracks.length;
  const withProblem = tracks.filter(t => t.hasProblem).length;
  const allHaveProblem = total > 0 && withProblem === total;
  const releasableCount = tracks.filter(t => t.hasProblem && !t.released).length;
  const releasedCount = tracks.filter(t => t.released).length;
  const missingNames = tracks.filter(t => !t.hasProblem).map(t => t.trackName);

  async function doReleaseAll() {
    const targets = tracks.filter(t => t.hasProblem && !t.released);
    if (targets.length === 0) { setConfirm(null); return; }
    setBulkBusy(true);
    try {
      const results = await Promise.all(targets.map(t => problemsApi.release(eventId, t.trackId)));
      results.forEach(r => patch(r.data));
      addToast({ type: 'success', title: 'ALL PROBLEMS RELEASED', message: `Released the problem for ${targets.length} track(s) at once.` });
      setConfirm(null);
    } catch (err) {
      addToast({ type: 'warning', title: 'RELEASE ALL FAILED', message: apiErrorMessage(err, 'Some tracks could not be released.') });
    } finally {
      setBulkBusy(false);
    }
  }

  async function doRetractAll() {
    const targets = tracks.filter(t => t.released);
    if (targets.length === 0) { setConfirm(null); return; }
    setBulkBusy(true);
    try {
      const results = await Promise.all(targets.map(t => problemsApi.retract(eventId, t.trackId)));
      results.forEach(r => patch(r.data));
      addToast({ type: 'success', title: 'ALL PROBLEMS HIDDEN', message: `Retracted the problem for ${targets.length} track(s).` });
      setConfirm(null);
    } catch (err) {
      addToast({ type: 'warning', title: 'RETRACT ALL FAILED', message: apiErrorMessage(err, 'Some tracks could not be retracted.') });
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) return <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 12 }}>Loading...</div>;
  if (total === 0) return <div style={{ color: C.textMuted, fontFamily: MONO, fontSize: 12 }}>No tracks yet</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Fairness toolbar — release/retract every track's problem together. */}
      {canManage && (
        <div style={{ padding: 14, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <PixelButton variant="cyber" disabled={releasableCount === 0 || bulkBusy || !canRelease} onClick={() => setConfirm("release")}>
              RELEASE ALL
            </PixelButton>
            <PixelButton variant="secondary" disabled={releasedCount === 0 || bulkBusy} onClick={() => setConfirm("retract")}>
              RETRACT ALL
            </PixelButton>
          </div>
          {!canRelease && (
            <div style={{ marginTop: 10, color: C.textMuted, fontFamily: MONO, fontSize: 11, lineHeight: 1.5 }}>
              You can upload problems now, but they can only be <strong>released</strong> once the event has started (IN_PROGRESS).
            </div>
          )}
        </div>
      )}

      {tracks.map(t => (
        <div key={t.trackId} style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ color: C.text, fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{t.trackName}</div>
          </div>
          <TrackProblemPanel
            eventId={eventId}
            trackId={t.trackId}
            problem={t}
            canManage={canManage}
            canRelease={canRelease}
            disabled={bulkBusy}
            onChange={patch}
            onRemoved={() => clearProblem(t.trackId)}
          />
        </div>
      ))}

      {confirm === "release" && (
        <ConfirmDialog
          title="Release all problems?"
          message={`Publish the problem for ${releasableCount} track(s) at once. Every team in those tracks will be able to download immediately.`}
          warning={!allHaveProblem
            ? `${total - withProblem} of ${total} tracks still have NO problem uploaded (${missingNames.join(", ")}). Their teams will have nothing to download — for a fair start, upload a problem for every track first.`
            : undefined}
          confirmLabel={allHaveProblem ? "RELEASE ALL" : "RELEASE ANYWAY"}
          variant="cyber"
          working={bulkBusy}
          onConfirm={doReleaseAll}
          onClose={() => { if (!bulkBusy) setConfirm(null); }}
        />
      )}
      {confirm === "retract" && (
        <ConfirmDialog
          title="Retract all problems?"
          message={`Hide the problem for ${releasedCount} track(s). Teams will no longer be able to download until you release again.`}
          confirmLabel="RETRACT ALL"
          variant="danger"
          working={bulkBusy}
          onConfirm={doRetractAll}
          onClose={() => { if (!bulkBusy) setConfirm(null); }}
        />
      )}
    </div>
  );
}

// ── Controlled row: one track's problem, data driven by the parent ──────────
export function TrackProblemPanel({
  eventId, trackId, problem, canManage, canRelease = true, disabled = false, onChange, onRemoved,
}: {
  eventId: number;
  trackId: number;
  problem: TrackProblem;
  canManage: boolean;
  canRelease?: boolean;
  disabled?: boolean;
  onChange: (updated: TrackProblem) => void;
  onRemoved: () => void;
}) {
  const { addToast } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the Manage dropdown on any outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const locked = busy || disabled;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setBusy(true);
    try {
      const res = await problemsApi.upload(eventId, trackId, file);
      onChange(res.data);
      addToast({ type: 'success', title: 'PROBLEM UPLOADED', message: `"${file.name}" attached to this track.` });
    } catch (err) {
      addToast({ type: 'warning', title: 'UPLOAD FAILED', message: apiErrorMessage(err, 'Failed to upload the problem file.') });
    } finally {
      setBusy(false);
    }
  }

  async function toggleRelease() {
    setBusy(true);
    try {
      const res = problem.released
        ? await problemsApi.retract(eventId, trackId)
        : await problemsApi.release(eventId, trackId);
      onChange(res.data);
      addToast(problem.released
        ? { type: 'success', title: 'PROBLEM HIDDEN', message: 'Participants can no longer download it.' }
        : { type: 'success', title: 'PROBLEM RELEASED', message: 'Teams in this track can now download it.' });
    } catch (err) {
      addToast({ type: 'warning', title: 'ACTION FAILED', message: apiErrorMessage(err, 'Failed to update the problem.') });
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setMenuOpen(false);
    setBusy(true);
    try {
      await problemsApi.remove(eventId, trackId);
      onRemoved();
      addToast({ type: 'success', title: 'PROBLEM REMOVED', message: 'The problem file was removed from this track.' });
    } catch (err) {
      addToast({ type: 'warning', title: 'REMOVE FAILED', message: apiErrorMessage(err, 'Failed to remove the problem.') });
    } finally {
      setBusy(false);
    }
  }

  async function onView() {
    try {
      await problemsApi.view(eventId, trackId);
    } catch (err) {
      addToast({ type: 'warning', title: 'CANNOT OPEN', message: apiErrorMessage(err, 'Failed to open the problem file.') });
    }
  }

  const has = problem.hasProblem;

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 14px", background: C.surface }}>
      <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={onFileChange} style={{ display: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ color: C.textMuted, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>PROBLEM</span>
          {has ? (
            <>
              <button
                type="button"
                onClick={onView}
                title="Open to view"
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: C.cyanBright, fontFamily: MONO, fontSize: 12, textDecoration: "underline",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240,
                }}
              >
                {problem.fileName}
              </button>
              {problem.fileSize ? (
                <span style={{ color: C.textDim, fontFamily: MONO, fontSize: 11 }}>{formatSize(problem.fileSize)}</span>
              ) : null}
              <PixelBadge color={problem.released ? "green" : "yellow"}>
                {problem.released ? "RELEASED" : "NOT RELEASED"}
              </PixelBadge>
            </>
          ) : (
            <span style={{ color: C.textDim, fontFamily: MONO, fontSize: 12, fontStyle: "italic" }}>No problem uploaded</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!has && canManage && (
            <PixelButton size="sm" variant="cyber" onClick={() => fileInputRef.current?.click()} disabled={locked}>UPLOAD</PixelButton>
          )}
          {has && canManage && (
            <>
              <span title={!problem.released && !canRelease
                ? "Problems can only be released after the event has started (IN_PROGRESS)."
                : undefined}>
                <PixelButton
                  size="sm"
                  variant={problem.released ? "secondary" : "cyber"}
                  onClick={toggleRelease}
                  disabled={locked || (!problem.released && !canRelease)}
                >
                  {problem.released ? "RETRACT" : "RELEASE"}
                </PixelButton>
              </span>
              <div ref={menuRef} style={{ position: "relative" }}>
                <PixelButton size="sm" variant="secondary" onClick={() => setMenuOpen(o => !o)} disabled={locked}>
                  MANAGE ▾
                </PixelButton>
                {menuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20, minWidth: 150,
                    background: C.surface2, border: `1px solid ${C.border}`, boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                  }}>
                    <MenuItem label="Replace file" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }} />
                    <MenuItem label="Remove file" danger onClick={onRemove} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// One row inside the Manage dropdown.
function MenuItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left", cursor: "pointer",
        background: "none", border: "none", padding: "8px 12px",
        color: danger ? "#f87171" : C.text, fontFamily: MONO, fontSize: 12,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
    >
      {label}
    </button>
  );
}
