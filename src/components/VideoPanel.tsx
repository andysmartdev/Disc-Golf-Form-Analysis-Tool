import { useRef, useId, useState, useCallback } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import type { Side } from '../types';
import './VideoPanel.css';

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

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
}

export function VideoPanel({ side, player }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const {
    videoRef, src, fileName, isPlaying, currentTime, duration,
    playbackRate, syncPoint, loadFile, togglePlay, seek, setPlaybackRate,
    setSyncPoint, clearSyncPoint,
  } = player;

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
        <button
          className="btn btn--load"
          onClick={() => fileInputRef.current?.click()}
        >
          {src ? '⇄ Swap' : '+ Load'}
        </button>
      </div>

      {/* Viewport */}
      <div
        className={`video-panel__viewport${isDragging ? ' video-panel__viewport--drag' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {src ? (
          <video
            ref={videoRef}
            src={src}
            className="video-panel__video"
            playsInline
            preload="metadata"
            onClick={togglePlay}
          />
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

      {/* Controls */}
      <div className="video-panel__controls">
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
            />
            {syncMarkerPercent !== null && (
              <div
                className="scrubber-track__sync-marker"
                style={{ left: `${syncMarkerPercent}%` }}
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
            className={`btn btn--icon ${src ? 'btn--primary' : 'btn--ghost'}`}
            onClick={togglePlay}
            disabled={!src}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Rewind to start */}
          <button
            className="btn btn--icon btn--ghost"
            onClick={() => seek(0)}
            disabled={!src}
            aria-label="Rewind to start"
          >
            ⏮
          </button>

          {/* Jump to sync point */}
          <button
            className="btn btn--icon btn--ghost"
            onClick={() => syncPoint !== null && seek(syncPoint)}
            disabled={!src || syncPoint === null}
            aria-label="Jump to sync point"
            title="Jump to sync point"
          >
            ⊙
          </button>

          {/* Speed */}
          <select
            className="speed-select"
            value={playbackRate}
            onChange={e => setPlaybackRate(parseFloat(e.target.value))}
            disabled={!src}
            aria-label="Playback speed"
          >
            {SPEED_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 1 ? '1× Speed' : `${s}×`}</option>
            ))}
          </select>

          {/* Set sync point */}
          <button
            className={`btn btn--ghost ${syncPoint !== null ? 'btn--active' : 'btn--accent2'}`}
            style={{ marginLeft: 'auto' }}
            onClick={setSyncPoint}
            disabled={!src}
            title="Mark current position as sync point"
          >
            ⌖ Set Sync
          </button>

          {/* Clear sync */}
          {syncPoint !== null && (
            <>
              <div className="sync-badge">
                <span>⌖</span>
                <span>{formatTime(syncPoint)}</span>
              </div>
              <button
                className="btn btn--icon btn--danger"
                onClick={clearSyncPoint}
                aria-label="Clear sync point"
                title="Clear sync point"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
