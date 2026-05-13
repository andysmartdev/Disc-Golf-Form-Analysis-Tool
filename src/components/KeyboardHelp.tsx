import { useEffect } from 'react';
import './KeyboardHelp.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kh-key">{children}</kbd>;
}

export function KeyboardHelp({ isOpen, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="kh-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Keyboard shortcuts">
      <div className="kh-panel" onClick={e => e.stopPropagation()}>

        <div className="kh-header">
          <span className="kh-title">⌨ Keyboard Shortcuts</span>
          <button className="kh-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="kh-body">
          {/* Global */}
          <div className="kh-section-label">Global</div>
          <div className="kh-rows">
            <div className="kh-row">
              <Kbd>Space</Kbd>
              <span>Play / Pause both players</span>
            </div>
            <div className="kh-row">
              <Kbd>Enter</Kbd>
              <span>Sync to sync points (or rewind both to 0:00)</span>
            </div>
            <div className="kh-row">
              <span className="kh-combo"><Kbd>←</Kbd><Kbd>→</Kbd></span>
              <span>Seek both players ←&nbsp;/&nbsp;→ (~1 frame @ 60 fps)</span>
            </div>
            <div className="kh-row">
              <span className="kh-combo"><Kbd>[</Kbd><Kbd>]</Kbd></span>
              <span>Speed down / Speed up</span>
            </div>
            <div className="kh-row">
              <Kbd>\</Kbd>
              <span>Reset playback speed to 1×</span>
            </div>
            <div className="kh-row">
              <span className="kh-combo"><Kbd>Shift</Kbd><span className="kh-plus">+</span><Kbd>?</Kbd></span>
              <span>Toggle this help panel</span>
            </div>
          </div>

          {/* Per-player — two-column grid */}
          <div className="kh-columns">
            {/* Player A */}
            <div className="kh-player">
              <div className="kh-section-label kh-section-label--a">Player A  <span className="kh-hand">(left hand)</span></div>
              <div className="kh-rows">
                <div className="kh-row"><Kbd>W</Kbd><span>Play / Pause</span></div>
                <div className="kh-row"><Kbd>Q</Kbd><span>Rewind to start</span></div>
                <div className="kh-row"><Kbd>E</Kbd><span>Jump to sync point</span></div>
                <div className="kh-row"><Kbd>S</Kbd><span>Set sync point here</span></div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>Shift</Kbd><span className="kh-plus">+</span><Kbd>S</Kbd></span>
                  <span>Clear sync point</span>
                </div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>A</Kbd><Kbd>D</Kbd></span>
                  <span>Seek ←&nbsp;/&nbsp;→ (0.1 s)</span>
                </div>
                <div className="kh-row"><Kbd>Z</Kbd><span>Undo drawing stroke</span></div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>Shift</Kbd><span className="kh-plus">+</span><Kbd>Z</Kbd></span>
                  <span>Redo drawing stroke</span>
                </div>
              </div>
            </div>

            {/* Player B */}
            <div className="kh-player">
              <div className="kh-section-label kh-section-label--b">Player B  <span className="kh-hand">(right hand)</span></div>
              <div className="kh-rows">
                <div className="kh-row"><Kbd>I</Kbd><span>Play / Pause</span></div>
                <div className="kh-row"><Kbd>U</Kbd><span>Rewind to start</span></div>
                <div className="kh-row"><Kbd>O</Kbd><span>Jump to sync point</span></div>
                <div className="kh-row"><Kbd>K</Kbd><span>Set sync point here</span></div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>Shift</Kbd><span className="kh-plus">+</span><Kbd>K</Kbd></span>
                  <span>Clear sync point</span>
                </div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>J</Kbd><Kbd>L</Kbd></span>
                  <span>Seek ←&nbsp;/&nbsp;→ (0.1 s)</span>
                </div>
                <div className="kh-row"><Kbd>N</Kbd><span>Undo drawing stroke</span></div>
                <div className="kh-row">
                  <span className="kh-combo"><Kbd>Shift</Kbd><span className="kh-plus">+</span><Kbd>N</Kbd></span>
                  <span>Redo drawing stroke</span>
                </div>
              </div>
            </div>
          </div>

          <div className="kh-tip">
            <Kbd>Shift</Kbd>
            <span>+ any seek key jumps <strong>1 second</strong> instead of the default step</span>
            <span style={{ color: 'var(--text-dim)' }}>  ·  A/D J/L default: 0.1 s  ·  ← / → default: ~1 frame</span>
          </div>
        </div>
      </div>
    </div>
  );
}
