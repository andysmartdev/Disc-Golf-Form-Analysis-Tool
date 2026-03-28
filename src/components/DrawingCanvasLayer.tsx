import { useEffect, useRef } from 'react';
import type { DrawStroke, UseDrawingReturn } from '../hooks/useDrawing';
import { redrawAll } from '../hooks/useDrawing';

interface Props {
  drawing: UseDrawingReturn;
  /** zoomStyle intentionally not applied — canvas is anchored to the viewport, not the video */
  canDraw: boolean;
}

export function DrawingCanvasLayer({ drawing, canDraw }: Props) {
  const {
    committedRef, previewRef,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
    onTouchStart, onTouchMove, onTouchEnd,
    strokes, cursor,
  } = drawing;

  // Keep a ref of strokes for the ResizeObserver callback (avoid stale closure)
  const strokesRef = useRef<DrawStroke[]>(strokes);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  // Keep canvas resolution in sync with layout size; redraw on resize
  useEffect(() => {
    const canvas = committedRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;

    const syncSize = () => {
      const w = Math.round(canvas.clientWidth);
      const h = Math.round(canvas.clientHeight);
      if (!w || !h) return;
      if (canvas.width === w && canvas.height === h) return; // no change needed
      canvas.width  = w; canvas.height  = h;
      preview.width = w; preview.height = h;
      redrawAll(canvas, strokesRef.current);
    };

    syncSize(); // initial
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pointerEvents = canDraw ? 'all' : 'none';

  return (
    <>
      {/* Committed strokes — never receives pointer events directly */}
      <canvas
        ref={committedRef}
        className="drawing-canvas drawing-canvas--committed"
        style={{ pointerEvents: 'none' }}
        aria-hidden="true"
      />
      {/* Preview canvas — topmost, receives pointer events when drawing active */}
      <canvas
        ref={previewRef}
        className="drawing-canvas drawing-canvas--preview"
        style={{ pointerEvents, cursor: canDraw ? cursor : undefined }}
        onMouseDown={canDraw ? onMouseDown : undefined}
        onMouseMove={canDraw ? onMouseMove : undefined}
        onMouseUp={canDraw ? onMouseUp    : undefined}
        onMouseLeave={canDraw ? onMouseLeave : undefined}
        onTouchStart={canDraw ? onTouchStart : undefined}
        onTouchMove={canDraw ? onTouchMove   : undefined}
        onTouchEnd={canDraw ? onTouchEnd     : undefined}
        aria-hidden="true"
      />
    </>
  );
}
