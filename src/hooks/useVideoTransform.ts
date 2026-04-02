import { useState, useRef, useCallback, useEffect } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export interface VideoTransform { scale: number; tx: number; ty: number; }

/**
 * Zoom + pan transform for a single video viewport.
 *
 * Zoom:  mouse wheel  or  trackpad pinch (ctrlKey+wheel), anchored to cursor.
 *        Two-finger pinch on touch devices, anchored to the pinch midpoint.
 * Pan:   left-button drag (mouse) or single-finger drag (touch), only when scale > 1.
 *
 * Performance: during touch gestures the transform is applied via CSS custom
 * properties (--zoom-tx/ty/scale) directly on the container element, completely
 * bypassing React's render cycle. React state is only synced at gesture end so
 * the zoom badge can update.
 *
 * Scroll behaviour: e.preventDefault() is only called when the touch will
 * actually do something (2-finger pinch, or 1-finger drag when scale > 1).
 * Single-finger touches at scale 1 are left alone so the page can scroll.
 *
 * Constraints:
 *  · scale ∈ [1, 5] — cannot shrink below original size.
 *  · tx/ty clamped so no video border ever appears inside the viewport.
 *  · All interactions silently disabled while isPlaying = true.
 */
export function useVideoTransform(isPlaying: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [t, _setT] = useState<VideoTransform>({ scale: 1, tx: 0, ty: 0 });

  // Synchronous mirror of state for use inside event handlers.
  const tRef = useRef(t);

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

  /**
   * Write the transform directly to CSS custom properties on the container.
   * This skips React rendering — the browser composites the change on the GPU
   * without touching the JS thread again, giving smooth 60fps+ on mobile.
   */
  const applyVars = useCallback((tx: number, ty: number, scale: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty('--zoom-tx',    `${tx}px`);
    el.style.setProperty('--zoom-ty',    `${ty}px`);
    el.style.setProperty('--zoom-scale', String(scale));
  }, []);

  /** Commit a new transform — updates tRef, CSS vars, AND React state. */
  const setT = useCallback((updater: (prev: VideoTransform) => VideoTransform) => {
    _setT(prev => {
      const next = updater(prev);
      tRef.current = next;
      applyVars(next.tx, next.ty, next.scale);
      return next;
    });
  }, [applyVars]);

  const reset = useCallback(() => {
    const z: VideoTransform = { scale: 1, tx: 0, ty: 0 };
    tRef.current = z;
    applyVars(0, 0, 1);
    _setT(z);
  }, [applyVars]);

  // ── Wheel / trackpad pinch zoom ─────────────────────────────────────────
  // Non-passive listener so we can call preventDefault().
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
  // Performance: during move, transform is applied via applyVars (CSS custom
  // properties) to skip React renders. State is committed only on touchend.
  //
  // Scroll: preventDefault is only called when we're actually consuming the
  // gesture. Single-finger at scale=1 passes through so the page can scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let pinchDist   = 0;
    let pinchCenter = { x: 0, y: 0 };
    let gestureActive = false; // true while a zoom/pan gesture owns the touch

    const getDist = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const getMid  = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (isPlaying) return;

      if (e.touches.length === 2) {
        // Pinch — always consume (prevent browser native zoom).
        e.preventDefault();
        gestureActive = true;
        pinchDist   = getDist(e.touches);
        pinchCenter = getMid(e.touches);
        drag.current.active = false;
      } else if (e.touches.length === 1 && tRef.current.scale > 1) {
        // Single-finger pan — only when zoomed.
        e.preventDefault();
        gestureActive = true;
        drag.current = {
          active: true, moved: false,
          startX: e.touches[0].clientX, startY: e.touches[0].clientY,
          startTx: tRef.current.tx,     startTy: tRef.current.ty,
        };
      } else {
        // Single-finger at scale 1 — let the page scroll naturally.
        gestureActive = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPlaying || !gestureActive) return;
      e.preventDefault();

      if (e.touches.length === 2 && pinchDist > 0) {
        const dist   = getDist(e.touches);
        const center = getMid(e.touches);
        const rect   = el.getBoundingClientRect();

        const factor   = dist / pinchDist;
        const prev     = tRef.current;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * factor));
        const cx   = center.x - rect.left - rect.width  / 2;
        const cy   = center.y - rect.top  - rect.height / 2;
        const r    = newScale / prev.scale;
        const panX = center.x - pinchCenter.x;
        const panY = center.y - pinchCenter.y;
        const newT = clampT(cx - (cx - prev.tx) * r + panX, cy - (cy - prev.ty) * r + panY, newScale);

        // Apply visually without React re-render.
        tRef.current = newT;
        applyVars(newT.tx, newT.ty, newT.scale);

        pinchDist   = dist;
        pinchCenter = center;
      } else if (e.touches.length === 1 && drag.current.active) {
        const dx = e.touches[0].clientX - drag.current.startX;
        const dy = e.touches[0].clientY - drag.current.startY;
        if (!drag.current.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) drag.current.moved = true;
        if (drag.current.moved) {
          const newT = clampT(drag.current.startTx + dx, drag.current.startTy + dy, tRef.current.scale);
          tRef.current = newT;
          applyVars(newT.tx, newT.ty, newT.scale);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchDist = 0;

      // Commit the final transform to React state (updates zoom badge etc.).
      if (gestureActive) _setT(tRef.current);

      // Lifting one finger mid-pinch → continue as single-finger pan.
      if (e.touches.length === 1 && tRef.current.scale > 1) {
        gestureActive = true;
        drag.current = {
          active: true, moved: false,
          startX: e.touches[0].clientX, startY: e.touches[0].clientY,
          startTx: tRef.current.tx,     startTy: tRef.current.ty,
        };
      } else if (e.touches.length === 0) {
        gestureActive = false;
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
  }, [isPlaying, clampT, applyVars]);

  // ── Mouse drag pan ───────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  const wasDrag = useCallback(() => drag.current.moved, []);

  const cursor: React.CSSProperties['cursor'] =
    isPlaying   ? undefined :
    t.scale > 1 ? 'grab'    :
    'zoom-in';

  return { containerRef, t, reset, onMouseDown, wasDrag, cursor };
}
