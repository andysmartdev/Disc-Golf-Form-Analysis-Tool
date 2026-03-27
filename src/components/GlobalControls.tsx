import { useCallback } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import './GlobalControls.css';

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

interface Props {
  left: VideoPlayerControls;
  right: VideoPlayerControls;
}

export function GlobalControls({ left, right }: Props) {
  const bothLoaded = !!left.src && !!right.src;
  const bothSynced = left.syncPoint !== null && right.syncPoint !== null;

  const syncDuration = bothSynced
    ? Math.min(
        (left.duration || 0) - left.syncPoint!,
        (right.duration || 0) - right.syncPoint!
      )
    : 0;

  const syncOffset = bothSynced && left.syncPoint !== null
    ? Math.max(0, left.currentTime - left.syncPoint)
    : 0;

  const eitherPlaying = left.isPlaying || right.isPlaying;

  const playBoth = useCallback(() => {
    left.play();
    right.play();
  }, [left, right]);

  const pauseBoth = useCallback(() => {
    left.pause();
    right.pause();
  }, [left, right]);

  const syncPlay = useCallback(() => {
    if (!bothSynced) return;
    left.seek(left.syncPoint!);
    right.seek(right.syncPoint!);
    setTimeout(() => {
      left.play();
      right.play();
    }, 50);
  }, [left, right, bothSynced]);

  const handleGlobalSpeed = useCallback((rate: number) => {
    left.setPlaybackRate(rate);
    right.setPlaybackRate(rate);
  }, [left, right]);

  const handleSyncScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bothSynced) return;
    const offset = parseFloat(e.target.value);
    left.seek(left.syncPoint! + offset);
    right.seek(right.syncPoint! + offset);
  }, [left, right, bothSynced]);

  const syncScrubPct = syncDuration > 0 ? (syncOffset / syncDuration) * 100 : 0;

  return (
    <div className="global-controls">
      <div className="global-controls__title">Sync &amp; Global Controls</div>

      {/* Play both row */}
      <div className="global-controls__row">
        <span className="global-controls__section-label">Both</span>

        {eitherPlaying ? (
          <button
            className="btn btn--play-both btn--play-both--pause"
            onClick={pauseBoth}
            disabled={!bothLoaded}
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            className="btn btn--play-both"
            onClick={playBoth}
            disabled={!bothLoaded}
          >
            ▶ Play
          </button>
        )}

        <button
          className="btn btn--sync-play"
          onClick={syncPlay}
          disabled={!bothSynced}
          title={bothSynced ? 'Seek both to their sync points and play' : 'Set sync points on both players first'}
        >
          ⌖ Sync &amp; Play
        </button>

        {/* Global speed */}
        <span className="global-controls__section-label" style={{ marginLeft: '8px' }}>Speed</span>
        <select
          className="speed-select"
          defaultValue={1}
          onChange={e => handleGlobalSpeed(parseFloat(e.target.value))}
          disabled={!bothLoaded}
          aria-label="Set speed for both players"
        >
          {SPEED_OPTIONS.map(s => (
            <option key={s} value={s}>{s === 1 ? '1× (Both)' : `${s}× (Both)`}</option>
          ))}
        </select>
      </div>

      {/* Sync scrubber */}
      {bothSynced && (
        <>
          <div className="global-controls__divider" />
          <div className="sync-scrubber">
            <div className="sync-scrubber__label">
              <span>⌖ Synchronized Scrub</span>
              <span>offset: +{formatTime(syncOffset)}</span>
            </div>
            <div className="sync-scrubber__range-wrap">
              <input
                type="range"
                min={0}
                max={syncDuration}
                step={0.01}
                value={syncOffset}
                onChange={handleSyncScrub}
                style={{ '--pct': syncScrubPct } as React.CSSProperties}
                aria-label="Synchronized scrubber"
              />
            </div>
            <div className="sync-scrubber__time-display">
              <span>A sync: {formatTime(left.syncPoint!)}</span>
              <span>← scrub both →</span>
              <span>B sync: {formatTime(right.syncPoint!)}</span>
            </div>
          </div>
        </>
      )}

      {/* Status */}
      <div className="global-controls__divider" />
      <div className="global-controls__status">
        <span className={`status-chip ${left.src ? 'status-chip--ok' : 'status-chip--warn'}`}>
          A {left.src ? '✓' : '✗'}
        </span>
        <span className={`status-chip ${right.src ? 'status-chip--ok' : 'status-chip--warn'}`}>
          B {right.src ? '✓' : '✗'}
        </span>
        {bothSynced && (
          <span className="status-chip status-chip--info">⌖ Synced</span>
        )}
        {!bothSynced && bothLoaded && (
          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
            Set sync points on both players to enable synchronized scrubbing
          </span>
        )}
        {!bothLoaded && (
          <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
            Load videos into both players to enable global controls
          </span>
        )}
      </div>
    </div>
  );
}
