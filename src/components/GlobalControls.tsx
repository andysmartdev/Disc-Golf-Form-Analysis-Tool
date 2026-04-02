import { useCallback, useState } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import './GlobalControls.css';

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const DRIFT_THRESHOLD = 0.1; // seconds before we flag as drifted

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function formatDrift(seconds: number): string {
  return seconds < 1 ? `${Math.round(seconds * 1000)}ms` : `${seconds.toFixed(2)}s`;
}

interface Props {
  left: VideoPlayerControls;
  right: VideoPlayerControls;
  globalSpeed: number;
  onSpeedChange: (rate: number) => void;
}

export function GlobalControls({ left, right, globalSpeed, onSpeedChange }: Props) {
  const bothLoaded = !!left.src && !!right.src;
  const bothSynced = left.syncPoint !== null && right.syncPoint !== null;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // How much video is available after both sync points (shortest window wins).
  const syncDuration = bothSynced
    ? Math.max(0, Math.min(
        (left.duration || 0) - left.syncPoint!,
        (right.duration || 0) - right.syncPoint!
      ))
    : 0;

  // Derive offset directly from actual video positions — scrubber stays live
  // during playback and reflects any individual player movements immediately.
  const leftOffset  = bothSynced ? left.currentTime  - left.syncPoint!  : 0;
  const rightOffset = bothSynced ? right.currentTime - right.syncPoint! : 0;

  // Clamp to [0, syncDuration] for the scrubber range
  const syncOffset = Math.max(0, Math.min(leftOffset, syncDuration));
  const syncScrubPct = syncDuration > 0 ? (syncOffset / syncDuration) * 100 : 0;

  // Drift: how far apart are the players relative to their sync points?
  const drift = bothSynced ? Math.abs(leftOffset - rightOffset) : 0;
  const isDrifted = drift > DRIFT_THRESHOLD;

  const eitherPlaying = left.isPlaying || right.isPlaying;

  const playBoth = useCallback(() => {
    // Both calls are synchronous and within the same user-gesture activation.
    // playWithRetry detects if iOS aborts the first video when the second
    // starts and automatically retries after 200ms.
    const p1 = left.playWithRetry();
    const p2 = right.play();
    Promise.all([p1, p2]).catch(() => {});
  }, [left, right]);

  const pauseBoth = useCallback(() => {
    left.pause();
    right.pause();
  }, [left, right]);

  const sync = useCallback(() => {
    if (!bothSynced) return;
    const wasPlaying = eitherPlaying;
    left.seek(left.syncPoint!);
    right.seek(right.syncPoint!);
    if (wasPlaying) {
      setTimeout(() => {
        const p1 = left.playWithRetry();
        const p2 = right.play();
        Promise.all([p1, p2]).catch(() => {});
      }, 50);
    }
  }, [left, right, bothSynced, eitherPlaying]);

  const handleSyncScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bothSynced) return;
    const offset = parseFloat(e.target.value);
    left.seek(left.syncPoint! + offset);
    right.seek(right.syncPoint! + offset);
  }, [left, right, bothSynced]);

  return (
    <div className={`global-controls${isCollapsed ? ' global-controls--collapsed' : ''}`}>

      {/* Title bar — always visible; contains the collapse toggle */}
      <div className="global-controls__title">
        {!isCollapsed && <span>Sync &amp; Global Controls</span>}
        <button
          className="global-controls__toggle"
          onClick={() => setIsCollapsed(c => !c)}
          aria-label={isCollapsed ? 'Expand controls' : 'Collapse controls'}
          title={isCollapsed ? 'Expand controls' : 'Collapse controls'}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {/* Play both row — always visible */}
      <div className="global-controls__row">
        {!isCollapsed && <span className="global-controls__section-label">Both</span>}

        {eitherPlaying ? (
          <button
            className="btn btn--play-both btn--play-both--pause"
            onClick={pauseBoth}
            disabled={!bothLoaded}
            title="Pause both (Space)"
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            className="btn btn--play-both"
            onClick={playBoth}
            disabled={!bothLoaded}
            title="Play both (Space)"
          >
            ▶ Play
          </button>
        )}

        <button
          className={`btn btn--sync-play${isDrifted ? ' btn--sync-play--drifted' : ''}`}
          onClick={sync}
          disabled={!bothSynced}
          title={bothSynced
            ? 'Return to sync points (Enter)'
            : 'Set sync points on both players first (S · K)'}
        >
          ⌖ Sync
        </button>

        {!isCollapsed && (
          <span className="global-controls__section-label" style={{ marginLeft: '8px' }}>Speed</span>
        )}
        <select
          className="speed-select"
          value={globalSpeed}
          onChange={e => onSpeedChange(parseFloat(e.target.value))}
          aria-label="Set speed for both players"
          title="Playback speed · [ ] to change · \ to reset to 1×"
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 1 ? '1×' : `${s}×`}</option>
          ))}
        </select>
      </div>

      {/* Sync scrubber — visible when synced; simplified when collapsed */}
      {bothSynced && (
        <>
          {!isCollapsed && <div className="global-controls__divider" />}
          <div className="sync-scrubber">
            {!isCollapsed && (
              <div className="sync-scrubber__label">
                <span>⌖ Synchronized Scrub</span>
                <div className="sync-scrubber__label-right">
                  <span
                    className="drift-badge"
                    style={{ visibility: isDrifted ? 'visible' : 'hidden' }}
                    title="Out of sync — click Sync or press Enter to realign"
                  >
                    ⚡ {formatDrift(drift)} drift
                  </span>
                  <span>+{formatTime(syncOffset)}</span>
                </div>
              </div>
            )}
            <div className="sync-scrubber__range-wrap">
              <input
                type="range"
                min={0}
                max={syncDuration}
                step={0.01}
                value={syncOffset}
                onChange={handleSyncScrub}
                className={isDrifted ? 'scrubber--drifted' : ''}
                style={{ '--pct': syncScrubPct } as React.CSSProperties}
                aria-label="Synchronized scrubber"
                title="Scrub both · ← → (≈ 1 frame) · Shift + ← → (= ½s)"
              />
            </div>
            {!isCollapsed && (
              <div className="sync-scrubber__time-display">
                <span>A sync: {formatTime(left.syncPoint!)}</span>
                <span className="sync-scrubber__center-label">← scrub both →</span>
                <span>B sync: {formatTime(right.syncPoint!)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Status + hints — expanded only */}
      {!isCollapsed && (
        <>
          <div className="global-controls__divider" />
          <div className="global-controls__status">
            <span className={`status-chip ${
              left.syncPoint !== null ? 'status-chip--ok' :
              left.src ? 'status-chip--warn' : 'status-chip--dim'
            }`}>
              A {left.syncPoint !== null ? '✓' : '✗'}
            </span>
            <span className={`status-chip ${
              right.syncPoint !== null ? 'status-chip--ok' :
              right.src ? 'status-chip--warn' : 'status-chip--dim'
            }`}>
              B {right.syncPoint !== null ? '✓' : '✗'}
            </span>
            {bothSynced && !isDrifted && (
              <span className="status-chip status-chip--info">⌖ In Sync</span>
            )}
            {bothSynced && isDrifted && (
              <span className="status-chip status-chip--warn">⚡ Drifted</span>
            )}
            {!bothLoaded && (
              <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-xs)' }}>
                Load videos into both players to get started
              </span>
            )}
            {bothLoaded && !bothSynced && (
              <span style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-xs)' }}>
                {left.syncPoint === null && right.syncPoint === null
                  ? 'Set sync points on both players to enable synchronized scrubbing'
                  : left.syncPoint === null
                  ? 'Set a sync point on Player A to enable synchronized scrubbing'
                  : 'Set a sync point on Player B to enable synchronized scrubbing'}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
