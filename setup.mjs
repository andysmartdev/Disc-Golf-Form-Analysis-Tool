// Run once: node setup.mjs
// Creates all src/ and public/ directories and files for the DG Form Analyzer app.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const src = (...p) => join(ROOT, 'src', ...p);
const pub = (...p) => join(ROOT, 'public', ...p);

// ── Create directories ────────────────────────────────────────────────────────
for (const dir of [
  join(ROOT, 'public'),
  src(),
  src('types'),
  src('hooks'),
  src('components'),
]) {
  mkdirSync(dir, { recursive: true });
  console.log('mkdir', dir);
}

// ── Helper ────────────────────────────────────────────────────────────────────
function write(path, content) {
  writeFileSync(path, content, 'utf8');
  console.log('write', path);
}

// ── public/disc.svg ───────────────────────────────────────────────────────────
write(pub('disc.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="none" stroke="#00c8ff" stroke-width="6"/>
  <circle cx="50" cy="50" r="20" fill="none" stroke="#00c8ff" stroke-width="4"/>
  <circle cx="50" cy="50" r="6" fill="#00c8ff"/>
</svg>
`);

// ── src/types/index.ts ────────────────────────────────────────────────────────
write(src('types', 'index.ts'), `export interface VideoState {
  src: string | null;
  fileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  syncPoint: number | null;
}

export type Theme = 'dark' | 'light';

export type Side = 'left' | 'right';
`);

// ── src/hooks/useTheme.ts ─────────────────────────────────────────────────────
write(src('hooks', 'useTheme.ts'), `import { useState, useEffect } from 'react';
import type { Theme } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('dg-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dg-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
`);

// ── src/hooks/useVideoPlayer.ts ───────────────────────────────────────────────
write(src('hooks', 'useVideoPlayer.ts'), `import { useRef, useState, useCallback, useEffect } from 'react';

export interface VideoPlayerControls {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src: string | null;
  fileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  syncPoint: number | null;
  loadFile: (file: File) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setSyncPoint: () => void;
  clearSyncPoint: () => void;
  setCurrentTime: (t: number) => void;
}

export function useVideoPlayer(): VideoPlayerControls {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [syncPoint, setSyncPointState] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setFileName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSyncPointState(null);
  }, []);

  const play = useCallback(() => { videoRef.current?.play(); }, []);
  const pause = useCallback(() => { videoRef.current?.pause(); }, []);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
    setCurrentTime(v.currentTime);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, []);

  const setSyncPoint = useCallback(() => {
    const v = videoRef.current;
    if (v) setSyncPointState(v.currentTime);
  }, []);

  const clearSyncPoint = useCallback(() => setSyncPointState(null), []);

  return {
    videoRef,
    src,
    fileName,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    syncPoint,
    loadFile,
    play,
    pause,
    togglePlay,
    seek,
    setPlaybackRate,
    setSyncPoint,
    clearSyncPoint,
    setCurrentTime,
  };
}
`);

// ── src/index.css ─────────────────────────────────────────────────────────────
write(src('index.css'), `/* ── CSS Custom Properties ─────────────────────────── */
:root[data-theme='dark'] {
  --bg:          #080b14;
  --surface:     #0f1420;
  --card:        #141926;
  --card-hover:  #1a2235;
  --border:      #1e2d45;
  --border-subtle: #16202f;
  --text:        #e2e8f8;
  --text-muted:  #6b7a99;
  --text-dim:    #3d4e6b;
  --accent:      #00c8ff;
  --accent-dim:  #005f7a;
  --accent2:     #7c5cfc;
  --danger:      #ff4d6d;
  --success:     #22d3a0;
  --warning:     #f59e0b;
  --shadow:      0 4px 24px rgba(0, 0, 0, 0.6);
  --shadow-sm:   0 2px 8px rgba(0, 0, 0, 0.4);
  --glow:        0 0 20px rgba(0, 200, 255, 0.15);
}

:root[data-theme='light'] {
  --bg:          #f0f4fc;
  --surface:     #ffffff;
  --card:        #f8faff;
  --card-hover:  #eef2ff;
  --border:      #d8e0f0;
  --border-subtle: #e8edf8;
  --text:        #1a2040;
  --text-muted:  #6474a0;
  --text-dim:    #b0bcd8;
  --accent:      #0077cc;
  --accent-dim:  #cce4ff;
  --accent2:     #6644cc;
  --danger:      #e0284a;
  --success:     #14a87a;
  --warning:     #d97706;
  --shadow:      0 4px 24px rgba(0, 0, 0, 0.1);
  --shadow-sm:   0 2px 8px rgba(0, 0, 0, 0.06);
  --glow:        0 0 20px rgba(0, 119, 204, 0.08);
}

/* ── Reset ─────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; }

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
  transition: background 0.25s ease, color 0.25s ease;
}

/* ── Scrollbar ─────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

/* ── Range input (global base) ─────────────────────── */
input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  cursor: pointer;
  outline: none;
  transition: background 0.2s;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--surface);
  box-shadow: 0 0 6px var(--accent);
  transition: transform 0.15s, box-shadow 0.15s;
}
input[type='range']:hover::-webkit-slider-thumb { transform: scale(1.3); }
input[type='range']::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--surface);
}

/* ── Button base ───────────────────────────────────── */
button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.15s ease;
}
button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ── Utils ─────────────────────────────────────────── */
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`);

// ── src/main.tsx ──────────────────────────────────────────────────────────────
write(src('main.tsx'), `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`);

// ── src/App.css ───────────────────────────────────────────────────────────────
write(src('App.css'), `/* ── App shell ───────────────────────────────────── */
.app {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ── Header ──────────────────────────────────────── */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 4px 14px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 20px;
  gap: 16px;
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-header__logo {
  width: 40px;
  height: 40px;
  color: var(--accent);
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--accent));
}

.app-header__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.app-header__sub {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  margin-top: 2px;
}

/* ── Main ────────────────────────────────────────── */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
}

/* ── Players grid ────────────────────────────────── */
.players-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}

/* ── Controls section ────────────────────────────── */
.controls-section {
  width: 100%;
}

/* ── Footer ──────────────────────────────────────── */
.app-footer {
  border-top: 1px solid var(--border-subtle);
  padding: 14px 4px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
  letter-spacing: 0.03em;
}

/* ── Responsive: tablet ──────────────────────────── */
@media (max-width: 900px) {
  .app { padding: 0 12px; }
  .app-header { padding: 14px 4px 12px; margin-bottom: 16px; }
  .app-header__title { font-size: 1.2rem; }
  .players-grid { grid-template-columns: 1fr; gap: 12px; }
}

/* ── Responsive: phone ───────────────────────────── */
@media (max-width: 600px) {
  .app { padding: 0 8px; }
  .app-header { flex-wrap: wrap; gap: 10px; padding: 12px 4px 10px; margin-bottom: 12px; }
  .app-header__logo { width: 32px; height: 32px; }
  .app-header__title { font-size: 1.05rem; }
  .app-header__sub { display: none; }
  .players-grid { gap: 10px; }
  .global-controls { padding: 14px 14px; }
}
`);

// ── src/App.tsx ───────────────────────────────────────────────────────────────
write(src('App.tsx'), `import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useTheme } from './hooks/useTheme';
import { VideoPanel } from './components/VideoPanel';
import { GlobalControls } from './components/GlobalControls';
import { ThemeToggle } from './components/ThemeToggle';
import './App.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const leftPlayer = useVideoPlayer();
  const rightPlayer = useVideoPlayer();

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"/>
              <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="4"/>
              <circle cx="50" cy="50" r="6" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h1 className="app-header__title">DG Form Analyzer</h1>
            <p className="app-header__sub">Side-by-side disc golf throw analysis</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {/* Video players */}
        <section className="players-grid" aria-label="Video players">
          <VideoPanel side="left" player={leftPlayer} />
          <VideoPanel side="right" player={rightPlayer} />
        </section>

        {/* Global controls */}
        <section className="controls-section" aria-label="Global controls">
          <GlobalControls left={leftPlayer} right={rightPlayer} />
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>DG Form Analyzer &nbsp;\u00b7\u00a0 load videos, set sync points, compare &amp; analyze</span>
      </footer>
    </div>
  );
}
`);

// ── src/components/ThemeToggle.css ────────────────────────────────────────────
write(src('components', 'ThemeToggle.css'), `.theme-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle__btn {
  position: relative;
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: var(--border);
  padding: 0;
  border: 1px solid var(--border);
  transition: background 0.25s;
  flex-shrink: 0;
}

.theme-toggle__btn:hover { background: var(--text-dim); }

.theme-toggle__track {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 0 4px;
  justify-content: space-between;
  pointer-events: none;
}

.theme-toggle__icon {
  font-size: 13px;
  line-height: 1;
}

.theme-toggle__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s;
  box-shadow: 0 0 8px var(--accent);
}

[data-theme='light'] .theme-toggle__thumb {
  transform: translateX(24px);
}

.theme-toggle__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
`);

// ── src/components/ThemeToggle.tsx ────────────────────────────────────────────
write(src('components', 'ThemeToggle.tsx'), `import type { Theme } from '../types';
import './ThemeToggle.css';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle__btn"
        onClick={onToggle}
        aria-label={\`Switch to \${theme === 'dark' ? 'light' : 'dark'} theme\`}
      >
        <span className="theme-toggle__track">
          <span className="theme-toggle__icon">🌙</span>
          <span className="theme-toggle__icon">☀️</span>
        </span>
        <span className="theme-toggle__thumb" />
      </button>
      <span className="theme-toggle__label">{theme}</span>
    </div>
  );
}
`);

// ── src/components/VideoPanel.css ─────────────────────────────────────────────
write(src('components', 'VideoPanel.css'), `/* ── Panel wrapper ───────────────────────────────── */
.video-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: box-shadow 0.2s;
  min-width: 0;
}
.video-panel:hover { box-shadow: var(--shadow), var(--glow); }

/* ── Panel header ────────────────────────────────── */
.video-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-subtle);
  gap: 8px;
  min-height: 44px;
}

.video-panel__label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.video-panel__filename {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
  flex: 1;
  text-align: right;
}

/* ── Video area ──────────────────────────────────── */
.video-panel__viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}

.video-panel__video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.video-panel__empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.video-panel__empty:hover { background: rgba(255,255,255,0.03); }

.video-panel__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px dashed var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--text-dim);
  transition: border-color 0.2s, color 0.2s;
}
.video-panel__empty:hover .video-panel__empty-icon {
  border-color: var(--accent);
  color: var(--accent);
}

.video-panel__empty-text {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}
.video-panel__empty-sub {
  font-size: 11px;
  color: var(--text-dim);
}

/* ── Controls area ───────────────────────────────── */
.video-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
  background: var(--surface);
  border-top: 1px solid var(--border-subtle);
}

/* ── Scrubber row ────────────────────────────────── */
.scrubber-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scrubber-row__time {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
  min-width: 70px;
  text-align: right;
}

.scrubber-track {
  position: relative;
  flex: 1;
  height: 20px;
  display: flex;
  align-items: center;
}

.scrubber-track input[type='range'] { height: 4px; }

.scrubber-track__sync-marker {
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  width: 3px;
  height: 14px;
  background: var(--accent2);
  border-radius: 2px;
  pointer-events: none;
  box-shadow: 0 0 6px var(--accent2);
}

/* ── Playback buttons row ────────────────────────── */
.controls-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.btn--icon {
  width: 32px;
  padding: 0;
  border-radius: 8px;
}

.btn--primary {
  background: var(--accent);
  color: #000;
}
.btn--primary:hover { filter: brightness(1.15); box-shadow: 0 0 12px var(--accent); }

.btn--ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}
.btn--ghost:hover { background: var(--card-hover); color: var(--text); border-color: var(--text-dim); }

.btn--accent2 {
  background: transparent;
  color: var(--accent2);
  border: 1px solid var(--accent2);
}
.btn--accent2:hover { background: var(--accent2); color: #fff; box-shadow: 0 0 10px var(--accent2); }

.btn--danger {
  background: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}
.btn--danger:hover { background: var(--danger); color: #fff; }

.btn--active {
  background: var(--accent2) !important;
  color: #fff !important;
  border-color: var(--accent2) !important;
  box-shadow: 0 0 10px var(--accent2);
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── Speed selector ──────────────────────────────── */
.speed-select {
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}
.speed-select:hover { border-color: var(--text-dim); }
.speed-select:focus { border-color: var(--accent); }

/* ── Sync point badge ────────────────────────────── */
.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  height: 22px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent2) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent2) 40%, transparent);
  font-size: 11px;
  color: var(--accent2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── File input hidden ───────────────────────────── */
.file-input-hidden { display: none; }

/* ── Load button ─────────────────────────────────── */
.btn--load {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  font-size: 11px;
  height: 26px;
  padding: 0 10px;
  border-radius: 6px;
  white-space: nowrap;
}
.btn--load:hover {
  background: var(--accent);
  color: #000;
  box-shadow: 0 0 10px var(--accent);
}
`);

// ── src/components/VideoPanel.tsx ─────────────────────────────────────────────
write(src('components', 'VideoPanel.tsx'), `import { useRef, useId } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import type { Side } from '../types';
import './VideoPanel.css';

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return \`\${m}:\${String(s).padStart(2, '0')}.\${String(cs).padStart(2, '0')}\`;
}

interface Props {
  side: Side;
  player: VideoPlayerControls;
}

export function VideoPanel({ side, player }: Props) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="video-panel__viewport">
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
            aria-label={\`Load video for \${label}\`}
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
              aria-label={\`\${label} timeline\`}
            />
            {syncMarkerPercent !== null && (
              <div
                className="scrubber-track__sync-marker"
                style={{ left: \`\${syncMarkerPercent}%\` }}
                title={\`Sync point: \${formatTime(syncPoint!)}\`}
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
            className={\`btn btn--icon \${src ? 'btn--primary' : 'btn--ghost'}\`}
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
              <option key={s} value={s}>{s === 1 ? '1× Speed' : \`\${s}×\`}</option>
            ))}
          </select>

          {/* Set sync point */}
          <button
            className={\`btn btn--ghost \${syncPoint !== null ? 'btn--active' : 'btn--accent2'}\`}
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
`);

// ── src/components/GlobalControls.css ────────────────────────────────────────
write(src('components', 'GlobalControls.css'), `/* ── Global controls card ────────────────────────── */
.global-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow);
}

.global-controls__title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.global-controls__title::before,
.global-controls__title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

/* ── Row layouts ─────────────────────────────────── */
.global-controls__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.global-controls__section-label {
  font-size: 11px;
  color: var(--text-dim);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 56px;
}

/* ── Sync scrubber ───────────────────────────────── */
.sync-scrubber {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sync-scrubber__label {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sync-scrubber__range-wrap {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
}

.sync-scrubber__range-wrap input[type='range'] {
  background: linear-gradient(
    to right,
    var(--accent) 0%,
    var(--accent) calc(var(--pct, 0) * 1%),
    var(--border) calc(var(--pct, 0) * 1%),
    var(--border) 100%
  );
}

.sync-scrubber__time-display {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

/* ── Divider ─────────────────────────────────────── */
.global-controls__divider {
  height: 1px;
  background: var(--border-subtle);
}

/* ── Status bar ──────────────────────────────────── */
.global-controls__status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-dim);
  flex-wrap: wrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.status-chip--ok {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
}

.status-chip--warn {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
}

.status-chip--info {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

/* ── Big play-both button ────────────────────────── */
.btn--play-both {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Space Grotesk', sans-serif;
  background: var(--accent);
  color: #000;
  border: none;
  letter-spacing: 0.03em;
}
.btn--play-both:hover:not(:disabled) {
  filter: brightness(1.15);
  box-shadow: 0 0 20px var(--accent);
}
.btn--play-both--pause {
  background: var(--card-hover);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn--play-both--pause:hover:not(:disabled) {
  border-color: var(--text-muted);
  box-shadow: none;
  filter: none;
}

.btn--sync-play {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Space Grotesk', sans-serif;
  background: transparent;
  color: var(--accent2);
  border: 1.5px solid var(--accent2);
}
.btn--sync-play:hover:not(:disabled) {
  background: var(--accent2);
  color: #fff;
  box-shadow: 0 0 16px var(--accent2);
}
`);

// ── src/components/GlobalControls.tsx ────────────────────────────────────────
write(src('components', 'GlobalControls.tsx'), `import { useCallback } from 'react';
import type { VideoPlayerControls } from '../hooks/useVideoPlayer';
import './GlobalControls.css';

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00.00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return \`\${m}:\${String(s).padStart(2, '0')}.\${String(cs).padStart(2, '0')}\`;
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
            ⏸ Pause Both
          </button>
        ) : (
          <button
            className="btn btn--play-both"
            onClick={playBoth}
            disabled={!bothLoaded}
          >
            ▶ Play Both
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
            <option key={s} value={s}>{s === 1 ? '1× (Both)' : \`\${s}× (Both)\`}</option>
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
              <span>\u2190 scrub both \u2192</span>
              <span>B sync: {formatTime(right.syncPoint!)}</span>
            </div>
          </div>
        </>
      )}

      {/* Status */}
      <div className="global-controls__divider" />
      <div className="global-controls__status">
        <span className={\`status-chip \${left.src ? 'status-chip--ok' : 'status-chip--warn'}\`}>
          A {left.src ? '✓' : '✗'}
        </span>
        <span className={\`status-chip \${right.src ? 'status-chip--ok' : 'status-chip--warn'}\`}>
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
`);

console.log('\n✅ All files created successfully!');
console.log('\nNext steps:');
console.log('  npm install');
console.log('  npm run build');
console.log('  npm run dev');
