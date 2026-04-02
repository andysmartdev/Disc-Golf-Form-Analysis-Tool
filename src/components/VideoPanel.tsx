import { useRef, useId, useState, useCallback, useEffect } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import { useVideoTransform } from '../hooks/useVideoTransform';
import type { UseDrawingReturn } from '../hooks/useDrawing';
import type { Side } from '../types';
import { DrawingCanvasLayer } from './DrawingCanvasLayer';
import { DrawingToolbar } from './DrawingToolbar';
import './VideoPanel.css';
import './Drawing.css';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

interface Props {
  side: Side;
  player: VideoPlayerControls;
  globalSpeed: number;
  bothLoaded: boolean;
  drawing: UseDrawingReturn;
  onClearBoth: () => void;
}

export function VideoPanel({ side, player, globalSpeed, bothLoaded, drawing, onClearBoth }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const {
    videoRef, src, fileName, isPlaying, currentTime, duration,
    syncPoint, loadFile, togglePlay, seek,
    setSyncPoint, clearSyncPoint,
  } = player;

  // ── Zoom / pan transform ──────────────────────────────────────────────────
  const { containerRef, t: zoom, reset: resetZoom, onMouseDown: onZoomMouseDown, cursor: zoomCursor } =
    useVideoTransform(isPlaying);

  // Reset zoom whenever a new video is loaded
  useEffect(() => { resetZoom(); }, [src, resetZoom]);

  // ── Drawing overlay ───────────────────────────────────────────────────────
  // drawing is now a prop (state lifted to App.tsx for keyboard access)

  // When drawing mode is enabled, disable zoom interactions (and vice versa)
  // canDraw: drawing mode is on, video is loaded, and we're not playing
  const canDraw = drawing.enabled && !isPlaying && !!src;

  // ── File input / drag-and-drop ────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  // dragCounter tracks enter/leave across child elements to avoid flicker
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('video/'));
    if (file) loadFile(file);
  }, [loadFile]);

  const syncMarkerPercent = syncPoint !== null && duration > 0
    ? (syncPoint / duration) * 100
    : null;

  const label = side === 'left' ? 'Player A' : 'Player B';

  return (
    <div className="video-panel">
      {/* Header */}
      <div className="video-panel__header">
        <span className="video-panel__label">{label}</span>
        {fileName && (
          <span className="video-panel__filename" title={fileName}>{fileName}</span>
        )}
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept="video/*"
          className="file-input-hidden"
          onChange={handleFileChange}
        />
        {/* Draw mode toggle */}
        {src && (
          <button
            className={`btn--draw${drawing.enabled ? ' btn--draw-active' : ''}`}
            onClick={() => drawing.setEnabled(!drawing.enabled)}
            title={drawing.enabled ? 'Exit draw mode' : 'Draw on video (annotate)'}
            aria-pressed={drawing.enabled}
          >
            ✎{'\uFE0E'}
          </button>
        )}
        <button
          className="btn btn--load"
          onClick={() => fileInputRef.current?.click()}
        >
          {src ? '⇄\uFE0E Swap' : '+ Load'}
        </button>
      </div>

      {/* Viewport */}
      <div
        ref={containerRef}
        className={`video-panel__viewport${isDragging ? ' video-panel__viewport--drag' : ''}`}
        style={{
          cursor: isDragging ? undefined : (canDraw ? drawing.cursor : zoomCursor),
          // Lock out native browser gestures only when we're actively using the
          // viewport for zoom/pan (scale > 1) or drawing. At scale = 1 with no
          // draw mode, single-finger touches fall through so the page can scroll.
          touchAction: (src && (zoom.scale > 1 || canDraw)) ? 'none' : undefined,
        }}
        onMouseDown={canDraw ? undefined : onZoomMouseDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {src ? (
          <>
            <video
              ref={videoRef}
              src={src}
              className="video-panel__video"
              playsInline
              muted
              preload="metadata"
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              // Suppress iOS Safari's AirPlay overlay button
              {...{ 'x-webkit-airplay': 'deny' }}
            />
            <DrawingCanvasLayer
              drawing={drawing}
              canDraw={canDraw}
            />
            {zoom.scale > 1 && (
              <button
                className="video-panel__zoom-badge"
                onClick={e => { e.stopPropagation(); resetZoom(); }}
                onMouseDown={e => e.stopPropagation()}
                title="Click or double-click to reset zoom"
              >
                {zoom.scale.toFixed(1)}×
              </button>
            )}
          </>
        ) : (
          <div
            className="video-panel__empty"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            aria-label={`Load video for ${label}`}
          >
            <div className="video-panel__empty-icon">▶</div>
            <span className="video-panel__empty-text">Drop or click to load video</span>
            <span className="video-panel__empty-sub">MP4 · MOV · WEBM — up to 1080p 60fps</span>
          </div>
        )}
      </div>

      {/* Drawing toolbar — shown when draw mode is active */}
      {drawing.enabled && src && (
        <DrawingToolbar drawing={drawing} side={side} onClearBoth={onClearBoth} />
      )}

      {/* Controls — hidden while draw mode is active to keep the panel height stable */}
      {!drawing.enabled && <div className="video-panel__controls">
        {/* Scrubber */}
        <div className="scrubber-row">
          <div className="scrubber-track">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={handleScrub}
              disabled={!src}
              aria-label={`${label} timeline`}
              title={side === 'left'
                ? 'Scrub · A ← · D → · hold Shift for 1s steps'
                : 'Scrub · J ← · L → · hold Shift for 1s steps'}
            />
            {syncMarkerPercent !== null && (
              <div
                className="scrubber-track__sync-marker"
                style={{ left: `calc(${syncMarkerPercent}% + ${(1 - 2 * syncMarkerPercent / 100) * 7}px)` }}
                title={`Sync point: ${formatTime(syncPoint!)}`}
              />
            )}
          </div>
          <span className="scrubber-row__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Buttons row */}
        <div className="controls-row">
          {/* Play/Pause */}
          <button
            className={`btn btn--icon ${isPlaying ? 'btn--playing' : src ? 'btn--primary' : 'btn--ghost'}`}
            onClick={togglePlay}
            disabled={!src}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying
              ? `Pause (${side === 'left' ? 'W' : 'I'})`
              : `Play (${side === 'left' ? 'W' : 'I'})`}
          >
            {isPlaying ? '⏸\uFE0E' : '▶\uFE0E'}
          </button>

          {/* Rewind to start */}
          <button
            className="btn btn--icon btn--ghost"
            onClick={() => seek(0)}
            disabled={!src}
            aria-label="Rewind to start"
            title={`Rewind to start (${side === 'left' ? 'Q' : 'U'})`}
          >
            ⏮{'\uFE0E'}
          </button>

          {/* Jump to sync point */}
          <button
            className="btn btn--icon btn--ghost"
            onClick={() => syncPoint !== null && seek(syncPoint)}
            disabled={!src || syncPoint === null}
            aria-label="Jump to sync point"
            title={`Jump to sync point (${side === 'left' ? 'E' : 'O'})`}
          >
            ⊙{'\uFE0E'}
          </button>

          {/* Speed label (controlled globally) */}
          <span className="speed-label" title="Global speed · [ ] to change · \ to reset to 1×">
            {globalSpeed}×
          </span>

          {/* Set sync point */}
          <button
            className={`btn btn--ghost ${syncPoint !== null ? 'btn--active' : 'btn--accent2'}`}
            style={{ marginLeft: 'auto' }}
            onClick={setSyncPoint}
            disabled={!bothLoaded}
          title={bothLoaded
              ? `Set sync point here (${side === 'left' ? 'S' : 'K'})`
              : 'Load both players first'}
          >
            ⌖{'\uFE0E'} Set Sync
          </button>

          {/* Clear sync */}
          {syncPoint !== null && (
            <>
              <div className="sync-badge" title={`Sync point: ${formatTime(syncPoint)}`}>
                <span>⌖{'\uFE0E'}</span>
                <span className="sync-badge__time">{formatTime(syncPoint)}</span>
              </div>
              <button
                className="btn btn--icon btn--danger"
                onClick={clearSyncPoint}
                aria-label="Clear sync point"
                title={`Clear sync point (Shift+${side === 'left' ? 'S' : 'K'})`}
              >
                ✕{'\uFE0E'}
              </button>
            </>
          )}
        </div>
      </div>}
    </div>
  );
}
