import { useEffect, useRef } from 'react';
import type { VideoPlayerControls } from './useVideoPlayer';

const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export interface KeyboardControlsOptions {
  left: VideoPlayerControls;
  right: VideoPlayerControls;
  globalSpeed: number;
  onSpeedChange: (rate: number) => void;
  /** Seek both to sync points if set, otherwise seek both to 0:00 */
  onSync: () => void;
  onToggleHelp: () => void;
  helpOpen: boolean;
  drawingLeft?:  { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
  drawingRight?: { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };
}

/**
 * Global keyboard controls — registered once via a stable ref pattern so
 * the event listener is never torn down and re-added on every render.
 *
 * Layout:
 *   Global  : Space (play/pause both)  Enter (sync)  [ ] (speed)  \ (1×)  Shift+? (help)
 *   Player A: Q (rewind)  W (play/pause)  E (jump→sync)  A (seek−)  S (set sync)  D (seek+)
 *   Player B: U (rewind)  I (play/pause)  O (jump→sync)  J (seek−)  K (set sync)  L (seek+)
 *   Hold Shift with A/D or J/L for a 1-second step instead of 0.1 s.
 */
export function useKeyboardControls(opts: KeyboardControlsOptions) {
  // Mutable ref so the single listener always sees the latest state/callbacks.
  const r = useRef(opts);
  useEffect(() => { r.current = opts; });

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const { left, right, globalSpeed, onSpeedChange, onSync, onToggleHelp, helpOpen, drawingLeft, drawingRight } = r.current;

      // Never hijack typing in text fields
      const tgt = e.target as HTMLElement;
      if (
        tgt.tagName === 'TEXTAREA' ||
        (tgt.tagName === 'INPUT' && (tgt as HTMLInputElement).type !== 'range')
      ) return;

      // While help overlay is open only let Shift+? pass through (to close it)
      if (helpOpen && !(e.code === 'Slash' && e.shiftKey)) return;

      const step = e.shiftKey ? 0.5 : 1/60;
      // Arrow keys use a frame-level step (~1 frame at 60 fps). Shift bumps to 1 s.
      const frameStep = e.shiftKey ? 0.5 : 1 / 60;
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
      const seekL = (d: number) => left.seek(clamp(left.currentTime + d, 0, left.duration));
      const seekR = (d: number) => right.seek(clamp(right.currentTime + d, 0, right.duration));
      const bothLoaded = !!left.src && !!right.src;

      switch (e.code) {
        // ── Global ─────────────────────────────────────────────────────────
        case 'Space':
          e.preventDefault();
          if (left.isPlaying || right.isPlaying) {
            left.pause(); right.pause();
          } else {
            const p1 = left.playWithRetry();
            const p2 = right.play();
            Promise.all([p1, p2]).catch(() => {});
          }
          break;

        case 'Enter':
          e.preventDefault();
          onSync();
          break;

        case 'BracketLeft': {             // [  speed down
          e.preventDefault();
          const i = SPEEDS.indexOf(globalSpeed);
          if (i > 0) onSpeedChange(SPEEDS[i - 1]);
          break;
        }
        case 'BracketRight': {            // ]  speed up
          e.preventDefault();
          const i = SPEEDS.indexOf(globalSpeed);
          if (i < SPEEDS.length - 1) onSpeedChange(SPEEDS[i + 1]);
          break;
        }
        case 'Backslash':                 // \  reset speed to 1×
          e.preventDefault();
          onSpeedChange(1);
          break;

        case 'Slash':                     // Shift+?  toggle help
          if (e.shiftKey) { e.preventDefault(); onToggleHelp(); }
          break;

        // ── Player A  (Q W E · A S D · Z undo/redo drawing) ───────────────────
        case 'KeyQ': e.preventDefault(); if (left.src) left.seek(0);                                         break;
        case 'KeyW': e.preventDefault(); if (left.src) (left.isPlaying ? left.pause() : left.play());        break;
        case 'KeyE': e.preventDefault(); if (left.syncPoint !== null) left.seek(left.syncPoint);             break;
        case 'KeyA': e.preventDefault(); if (left.src) seekL(-step);                                         break;
        case 'KeyS':
          e.preventDefault();
          if (e.shiftKey) { if (left.syncPoint !== null) left.clearSyncPoint(); }
          else            { if (bothLoaded) left.setSyncPoint(); }
          break;
        case 'KeyD': e.preventDefault(); if (left.src) seekL(+step);                                         break;
        case 'KeyZ':
          e.preventDefault();
          if (e.shiftKey) { if (drawingLeft?.canRedo)  drawingLeft.redo();  }
          else            { if (drawingLeft?.canUndo)  drawingLeft.undo();  }
          break;

        // ── Player B  (U I O · J K L · N undo/redo drawing) ───────────────────
        case 'KeyU': e.preventDefault(); if (right.src) right.seek(0);                                       break;
        case 'KeyI': e.preventDefault(); if (right.src) (right.isPlaying ? right.pause() : right.play());    break;
        case 'KeyO': e.preventDefault(); if (right.syncPoint !== null) right.seek(right.syncPoint);          break;
        case 'KeyJ': e.preventDefault(); if (right.src) seekR(-step);                                        break;
        case 'KeyK':
          e.preventDefault();
          if (e.shiftKey) { if (right.syncPoint !== null) right.clearSyncPoint(); }
          else            { if (bothLoaded) right.setSyncPoint(); }
          break;
        case 'KeyL': e.preventDefault(); if (right.src) seekR(+step);                                        break;
        case 'KeyN':
          e.preventDefault();
          if (e.shiftKey) { if (drawingRight?.canRedo) drawingRight.redo(); }
          else            { if (drawingRight?.canUndo) drawingRight.undo(); }
          break;

        // ── Global scrubber (arrow keys — always intercept, even over range inputs) ──
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          const delta = e.code === 'ArrowLeft' ? -frameStep : +frameStep;
          const bothSynced = left.syncPoint !== null && right.syncPoint !== null;
          if (bothSynced) {
            // Mirror the mouse scrubber: anchor to sync points so drift is resolved
            // on the first keypress, then both move together in lockstep.
            const currentOffset = Math.max(0, left.currentTime - left.syncPoint!);
            const newOffset = Math.max(0, currentOffset + delta);
            left.seek(left.syncPoint! + newOffset);
            right.seek(right.syncPoint! + newOffset);
          } else {
            if (left.src)  seekL(delta);
            if (right.src) seekR(delta);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []); // register once — opts always accessed via ref
}
