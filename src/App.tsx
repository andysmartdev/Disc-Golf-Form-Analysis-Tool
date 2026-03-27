import { useVideoPlayer } from './hooks/useVideoPlayer';
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
        <span>DG Form Analyzer &nbsp;·  load videos, set sync points, compare &amp; analyze</span>
      </footer>
    </div>
  );
}
