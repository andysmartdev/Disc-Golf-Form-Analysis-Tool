import { useCallback, useState } from 'react';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useTheme } from './hooks/useTheme';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { VideoPanel } from './components/VideoPanel';
import { GlobalControls } from './components/GlobalControls';
import { ThemeToggle } from './components/ThemeToggle';
import { KeyboardHelp } from './components/KeyboardHelp';
import './App.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const leftPlayer = useVideoPlayer();
  const rightPlayer = useVideoPlayer();
  const [globalSpeed, setGlobalSpeed] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  const handleGlobalSpeed = useCallback((rate: number) => {
    setGlobalSpeed(rate);
    leftPlayer.setPlaybackRate(rate);
    rightPlayer.setPlaybackRate(rate);
  }, [leftPlayer, rightPlayer]);

  // When either player loads a new video, reset both players and global speed.
  const handleLeftLoad = useCallback((file: File) => {
    leftPlayer.loadFile(file);
    rightPlayer.reset();
    setGlobalSpeed(1);
  }, [leftPlayer, rightPlayer]);

  const handleRightLoad = useCallback((file: File) => {
    rightPlayer.loadFile(file);
    leftPlayer.reset();
    setGlobalSpeed(1);
  }, [leftPlayer, rightPlayer]);

  // Clearing a sync point stops both players — sync context is no longer valid.
  const handleClearLeftSync = useCallback(() => {
    leftPlayer.clearSyncPoint();
    leftPlayer.pause();
    rightPlayer.pause();
  }, [leftPlayer, rightPlayer]);

  const handleClearRightSync = useCallback(() => {
    rightPlayer.clearSyncPoint();
    leftPlayer.pause();
    rightPlayer.pause();
  }, [leftPlayer, rightPlayer]);

  // Enter key: sync to sync points if both set, otherwise rewind both to 0:00.
  const handleKeyboardSync = useCallback(() => {
    const bothSynced = leftPlayer.syncPoint !== null && rightPlayer.syncPoint !== null;
    const wasPlaying = leftPlayer.isPlaying || rightPlayer.isPlaying;
    if (bothSynced) {
      leftPlayer.seek(leftPlayer.syncPoint!);
      rightPlayer.seek(rightPlayer.syncPoint!);
    } else {
      leftPlayer.seek(0);
      rightPlayer.seek(0);
    }
    if (wasPlaying) {
      setTimeout(() => { leftPlayer.play(); rightPlayer.play(); }, 50);
    }
  }, [leftPlayer, rightPlayer]);

  const leftPlayerWithReset = { ...leftPlayer, loadFile: handleLeftLoad, clearSyncPoint: handleClearLeftSync };
  const rightPlayerWithReset = { ...rightPlayer, loadFile: handleRightLoad, clearSyncPoint: handleClearRightSync };

  useKeyboardControls({
    left: leftPlayerWithReset,
    right: rightPlayerWithReset,
    globalSpeed,
    onSpeedChange: handleGlobalSpeed,
    onSync: handleKeyboardSync,
    onToggleHelp: () => setShowHelp(h => !h),
    helpOpen: showHelp,
  });

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
        <div className="app-header__actions">
          <button
            className="app-header__help-btn"
            onClick={() => setShowHelp(h => !h)}
            aria-label="Keyboard shortcuts (Shift+?)"
            title="Keyboard shortcuts (Shift+?)"
          >
            ⌨
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="app-main">
        {/* Player A */}
        <div className="player-slot player-slot--left">
          <VideoPanel side="left" player={leftPlayerWithReset} globalSpeed={globalSpeed} bothLoaded={!!leftPlayer.src && !!rightPlayer.src} />
        </div>

        {/* Global controls — sits between players on mobile */}
        <section className="controls-section" aria-label="Global controls">
          <GlobalControls
            left={leftPlayerWithReset}
            right={rightPlayerWithReset}
            globalSpeed={globalSpeed}
            onSpeedChange={handleGlobalSpeed}
          />
        </section>

        {/* Player B */}
        <div className="player-slot player-slot--right">
          <VideoPanel side="right" player={rightPlayerWithReset} globalSpeed={globalSpeed} bothLoaded={!!leftPlayer.src && !!rightPlayer.src} />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>DG Form Analyzer &nbsp;·  load videos, set sync points, compare &amp; analyze</span>
      </footer>

      {/* ── Keyboard help modal ── */}
      <KeyboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
