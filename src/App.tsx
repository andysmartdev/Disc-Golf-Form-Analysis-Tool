import { useCallback, useState } from 'react';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useTheme } from './hooks/useTheme';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useDrawing } from './hooks/useDrawing';
import { VideoPanel } from './components/VideoPanel';
import { GlobalControls } from './components/GlobalControls';
import { ThemeToggle } from './components/ThemeToggle';
import { KeyboardHelp } from './components/KeyboardHelp';
import './App.css';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const leftPlayer  = useVideoPlayer();
  const rightPlayer = useVideoPlayer();
  const [globalSpeed, setGlobalSpeed] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  // Drawing state lives here so keyboard controls can access undo/redo
  const drawingLeft  = useDrawing(leftPlayer.isPlaying);
  const drawingRight = useDrawing(rightPlayer.isPlaying);

  const handleClearBothDrawings = useCallback(() => {
    drawingLeft.clear();
    drawingRight.clear();
  }, [drawingLeft, drawingRight]);

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
    drawingLeft:  { undo: drawingLeft.undo,  redo: drawingLeft.redo,  canUndo: drawingLeft.canUndo,  canRedo: drawingLeft.canRedo  },
    drawingRight: { undo: drawingRight.undo, redo: drawingRight.redo, canUndo: drawingRight.canUndo, canRedo: drawingRight.canRedo },
  });

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Ground line */}
                <line x1="6" y1="87" x2="94" y2="87" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>

                {/* Wheels — left */}
                <circle cx="24" cy="84" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="24" cy="84" r="2" fill="currentColor"/>
                {/* Wheels — right */}
                <circle cx="72" cy="84" r="6" fill="none" stroke="currentColor" strokeWidth="2"/>
                <circle cx="72" cy="84" r="2" fill="currentColor"/>

                {/* A-frame: left leg, right leg, top beam, cross-brace */}
                <line x1="24" y1="83" x2="40" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="72" y1="83" x2="52" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="40" y1="44" x2="52" y2="44" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="30" y1="64" x2="66" y2="64" stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>

                {/* Pivot fulcrum */}
                <circle cx="46" cy="44" r="3" fill="currentColor"/>

                {/* Throwing arm — line passes through pivot (46, 44) at ~72° */}
                <line x1="43" y1="53.5" x2="54.5" y2="17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>

                {/* Counterweight rope + block */}
                <line x1="43" y1="53.5" x2="43" y2="64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="37" y="64" width="12" height="11" rx="2" fill="currentColor"/>

                {/* Sling rope */}
                <line x1="54.5" y1="17" x2="77" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>

                {/* Projectile */}
                <circle cx="81" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.5"/>
              </svg>
          </div>
          <div>
            <h1 className="app-header__title">DG FAT</h1>
            <p className="app-header__sub">Side-By-Side Disc Golf Form Analysis Tool</p>
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
          <VideoPanel side="left" player={leftPlayerWithReset} globalSpeed={globalSpeed} bothLoaded={!!leftPlayer.src && !!rightPlayer.src}
            drawing={drawingLeft} onClearBoth={handleClearBothDrawings} />
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
          <VideoPanel side="right" player={rightPlayerWithReset} globalSpeed={globalSpeed} bothLoaded={!!leftPlayer.src && !!rightPlayer.src}
            drawing={drawingRight} onClearBoth={handleClearBothDrawings} />
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
