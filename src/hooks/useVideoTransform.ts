import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export interface VideoTransform { scale: number; tx: number; ty: number; }

/**
 * Zoom + pan transform for a single video viewport.
 *
 * Zoom:  mouse wheel  or  trackpad pinch (ctrlKey+wheel), anchored to cursor.
 * Pan:   left-button drag, only when scale > 1.
 *
 * Constraints:
 *  · scale ∈ [1, 5] — cannot shrink below original size.
 *  · tx/ty clamped so no video border ever appears inside the viewport.
 *  · All interactions silently disabled while isPlaying = true.
 */
export function useVideoTransform(isPlaying: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [t, _setT] = useState<VideoTransform>({ scale: 1, tx: 0, ty: 0 });

  // Keep a synchronous mirror of state for use inside event handlers.
  const tRef = useRef(t);
  const setT = useCallback((updater: (prev: VideoTransform) => VideoTransform) => {
    _setT(prev => {
      const next = updater(prev);
      tRef.current = next;
      return next;
    });
  }, []);

  const drag = useRef({
    active: false,
    moved: false,
    startX: 0, startY: 0,
    startTx: 0, startTy: 0,
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Clamp tx/ty so no border appears inside the visible viewport. */
  const clampT = useCallback((tx: number, ty: number, scale: number): VideoTransform => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width  ?? 0;
    const h = rect?.height ?? 0;
    const maxTx = w * (scale - 1) / 2;
    const maxTy = h * (scale - 1) / 2;
    return {
      scale,
      tx: Math.max(-maxTx, Math.min(maxTx, tx)),
      ty: Math.max(-maxTy, Math.min(maxTy, ty)),
    };
  }, []);

  const reset = useCallback(() => {
    const z: VideoTransform = { scale: 1, tx: 0, ty: 0 };
    tRef.current = z;
    _setT(z);
  }, []);

  // ── Wheel / trackpad pinch zoom ─────────────────────────────────────────
  // Must use a non-passive listener to call preventDefault().
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isPlaying) return;

      const rect = el.getBoundingClientRect();

      // Trackpad pinch fires ctrlKey=true with small deltaY values (~1–5).
      // Mouse wheel fires ctrlKey=false with larger deltaY values (~100–120).
      const sensitivity = e.ctrlKey ? 0.015 : 0.002;
      const factor = Math.exp(-e.deltaY * sensitivity);

      setT(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        if (Math.abs(newScale - prev.scale) < 0.0001) return prev;

        // Keep the exact pixel under the cursor stationary while zooming.
        const cx = (e.clientX - rect.left)  - rect.width  / 2;
        const cy = (e.clientY - rect.top)   - rect.height / 2;
        const r  = newScale / prev.scale;

        return clampT(cx - (cx - prev.tx) * r, cy - (cy - prev.ty) * r, newScale);
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isPlaying, clampT, setT]);

  // ── Touch: pinch-to-zoom + single-finger pan ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let pinchDist   = 0;
    let pinchCenter = { x: 0, y: 0 };

    const getDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const getMid  = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (isPlaying) return;
      if (e.touches.length === 2) {
        pinchDist   = getDist(e.touches);
        pinchCenter = getMid(e.touches);
        drag.current.active = false; // cancel any in-progress pan
      } else if (e.touches.length === 1 && tRef.current.scale > 1) {
        drag.current = {
          active: true, moved: false,
          startX: e.touches[0].clientX, startY: e.touches[0].clientY,
          startTx: tRef.current.tx,     startTy: tRef.current.ty,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (isPlaying) return;

      if (e.touches.length === 2 && pinchDist > 0) {
        const dist   = getDist(e.touches);
        const center = getMid(e.touches);
        const rect   = el.getBoundingClientRect();

        setT(prev => {
          const factor   = dist / pinchDist;
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
          // Zoom anchored to pinch midpoint + translate for center movement
          const cx   = center.x - rect.left - rect.width  / 2;
          const cy   = center.y - rect.top  - rect.height / 2;
          const r    = newScale / prev.scale;
          const panX = center.x - pinchCenter.x;
          const panY = center.y - pinchCenter.y;
          return clampT(cx - (cx - prev.tx) * r + panX, cy - (cy - prev.ty) * r + panY, newScale);
        });

        pinchDist   = dist;
        pinchCenter = center;
      } else if (e.touches.length === 1 && drag.current.active) {
        const dx = e.touches[0].clientX - drag.current.startX;
        const dy = e.touches[0].clientY - drag.current.startY;
        if (!drag.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) drag.current.moved = true;
        if (drag.current.moved) setT(prev => clampT(drag.current.startTx + dx, drag.current.startTy + dy, prev.scale));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length < 2) pinchDist = 0;
      // Lifting one finger during a pinch: seamlessly continue as single-finger pan
      if (e.touches.length === 1 && tRef.current.scale > 1) {
        drag.current = {
          active: true, moved: false,
          startX: e.touches[0].clientX, startY: e.touches[0].clientY,
          startTx: tRef.current.tx,     startTy: tRef.current.ty,
        };
      } else if (e.touches.length === 0) {
        drag.current.active = false;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [isPlaying, clampT, setT]);

  // ── Mouse drag pan ───────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Always reset moved flag so click detection is fresh each press.
    drag.current.moved  = false;
    drag.current.active = false;
    if (isPlaying || tRef.current.scale <= 1) return;
    drag.current.active  = true;
    drag.current.startX  = e.clientX;
    drag.current.startY  = e.clientY;
    drag.current.startTx = tRef.current.tx;
    drag.current.startTy = tRef.current.ty;
  }, [isPlaying]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        d.moved = true;
        document.body.style.cursor = 'grabbing';
      }
      if (d.moved) {
        setT(prev => clampT(d.startTx + dx, d.startTy + dy, prev.scale));
      }
    };

    const onUp = () => {
      if (drag.current.active) {
        drag.current.active = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [clampT, setT]);

  /** Returns true if the last mousedown turned into a drag — lets the caller
   *  suppress the following click event (e.g. don't toggle play). */
  const wasDrag = useCallback(() => drag.current.moved, []);

  const cursor: React.CSSProperties['cursor'] =
    isPlaying   ? undefined :
    t.scale > 1 ? 'grab'    :
    'zoom-in';

  return { containerRef, t, reset, onMouseDown, wasDrag, cursor };
}
