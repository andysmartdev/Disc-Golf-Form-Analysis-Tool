import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';

export type DrawTool = 'pencil' | 'line' | 'arrow' | 'circle' | 'rect' | 'eraser';

export const PRESET_COLORS = [
  '#ff3b30', '#ff9500', '#ffcc00', '#34c759',
  '#00c7be', '#007aff', '#5856d6', '#ff2d55',
  '#ffffff', '#aaaaaa', '#555555', '#1a1a1a',
];

export const PRESET_WIDTHS = [2, 4, 8, 16];

export interface Point { x: number; y: number }

export type DrawStroke =
  | { kind: 'path';    pts: Point[];           color: string; w: number; eraser: boolean }
  | { kind: 'line';    p1: Point; p2: Point;   color: string; w: number; arrow: boolean }
  | { kind: 'ellipse'; p1: Point; p2: Point;   color: string; w: number }
  | { kind: 'rect';    p1: Point; p2: Point;   color: string; w: number };

export interface UseDrawingReturn {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  tool: DrawTool;
  setTool: (t: DrawTool) => void;
  color: string;
  setColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  strokes: DrawStroke[];
  committedRef: RefObject<HTMLCanvasElement | null>;
  previewRef:   RefObject<HTMLCanvasElement | null>;
  onMouseDown:  (e: React.MouseEvent<HTMLCanvasElement>)  => void;
  onMouseMove:  (e: React.MouseEvent<HTMLCanvasElement>)  => void;
  onMouseUp:    () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchMove:  (e: React.TouchEvent<HTMLCanvasElement>) => void;
  onTouchEnd:   () => void;
  cursor: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (canvas.width  / rect.width),
    y: (clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function drawArrow(ctx: CanvasRenderingContext2D, p1: Point, p2: Point) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const angle = Math.atan2(dy, dx);
  const headLen = Math.max(12, Math.min(28, len * 0.28));
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI / 6), p2.y - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI / 6), p2.y - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function renderStroke(ctx: CanvasRenderingContext2D, s: DrawStroke) {
  ctx.save();
  ctx.lineWidth  = s.w;
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';
  const erasing = s.kind === 'path' && s.eraser;
  ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
  ctx.strokeStyle = erasing ? 'rgba(0,0,0,1)' : s.color;
  ctx.fillStyle   = erasing ? 'rgba(0,0,0,1)' : s.color;

  switch (s.kind) {
    case 'path': {
      if (s.pts.length === 1) {
        ctx.beginPath();
        ctx.arc(s.pts[0].x, s.pts[0].y, s.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.stroke();
      }
      break;
    }
    case 'line': {
      s.arrow ? drawArrow(ctx, s.p1, s.p2) : (() => {
        ctx.beginPath(); ctx.moveTo(s.p1.x, s.p1.y); ctx.lineTo(s.p2.x, s.p2.y); ctx.stroke();
      })();
      break;
    }
    case 'ellipse': {
      const cx = (s.p1.x + s.p2.x) / 2, cy = (s.p1.y + s.p2.y) / 2;
      const rx = Math.abs(s.p2.x - s.p1.x) / 2, ry = Math.abs(s.p2.y - s.p1.y) / 2;
      if (rx < 1 || ry < 1) break;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'rect': {
      ctx.beginPath();
      ctx.strokeRect(s.p1.x, s.p1.y, s.p2.x - s.p1.x, s.p2.y - s.p1.y);
      break;
    }
  }
  ctx.restore();
}

export function redrawAll(canvas: HTMLCanvasElement, strokes: DrawStroke[]) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) renderStroke(ctx, s);
}

const CURSOR_MAP: Record<DrawTool, string> = {
  pencil: 'crosshair', line: 'crosshair', arrow: 'crosshair',
  circle: 'crosshair', rect: 'crosshair',  eraser: 'cell',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDrawing(isPlaying: boolean): UseDrawingReturn {
  const [enabled, setEnabledState] = useState(false);
  const [tool,    setToolState]    = useState<DrawTool>('pencil');
  const [color,   setColor]        = useState(PRESET_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(PRESET_WIDTHS[1]);
  const [strokes, setStrokes]      = useState<DrawStroke[]>([]);
  const [future,  setFuture]       = useState<DrawStroke[]>([]); // redo stack

  const committedRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef   = useRef<HTMLCanvasElement | null>(null);
  const isDrawing    = useRef(false);
  const currentStroke = useRef<DrawStroke | null>(null);

  // Stale-ref mirrors for synchronous handler access
  const sr = useRef({ tool, color, strokeWidth });
  useEffect(() => { sr.current = { tool, color, strokeWidth }; });
  const strokesRef = useRef<DrawStroke[]>([]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  const futureRef = useRef<DrawStroke[]>([]);
  useEffect(() => { futureRef.current = future; }, [future]);

  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);
  const setTool    = useCallback((t: DrawTool) => setToolState(t), []);

  const undo = useCallback(() => {
    setStrokes(prev => {
      if (!prev.length) return prev;
      const removed = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      strokesRef.current = next;
      setFuture(f => { const nf = [...f, removed]; futureRef.current = nf; return nf; });
      if (committedRef.current) redrawAll(committedRef.current, next);
      return next;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(prev => {
      if (!prev.length) return prev;
      const restored = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      futureRef.current = next;
      setStrokes(s => { const ns = [...s, restored]; strokesRef.current = ns; if (committedRef.current) redrawAll(committedRef.current, ns); return ns; });
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setStrokes([]);   strokesRef.current = [];
    setFuture([]);    futureRef.current  = [];
    isDrawing.current = false;
    currentStroke.current = null;
    for (const ref of [committedRef, previewRef]) {
      if (ref.current) {
        const ctx = ref.current.getContext('2d')!;
        ctx.clearRect(0, 0, ref.current.width, ref.current.height);
      }
    }
  }, []);

  // ── Core draw primitives (shared by mouse + touch) ───────────────────────

  const startDraw = useCallback((clientX: number, clientY: number) => {
    if (isPlaying || !previewRef.current) return;
    const { tool, color, strokeWidth } = sr.current;
    isDrawing.current = true;
    const pt = getPoint(previewRef.current, clientX, clientY);
    if      (tool === 'pencil') currentStroke.current = { kind: 'path',    pts: [pt],           color, w: strokeWidth,     eraser: false };
    else if (tool === 'eraser') currentStroke.current = { kind: 'path',    pts: [pt],           color, w: strokeWidth * 3, eraser: true  };
    else if (tool === 'line')   currentStroke.current = { kind: 'line',    p1: pt, p2: {...pt}, color, w: strokeWidth, arrow: false };
    else if (tool === 'arrow')  currentStroke.current = { kind: 'line',    p1: pt, p2: {...pt}, color, w: strokeWidth, arrow: true  };
    else if (tool === 'circle') currentStroke.current = { kind: 'ellipse', p1: pt, p2: {...pt}, color, w: strokeWidth };
    else if (tool === 'rect')   currentStroke.current = { kind: 'rect',    p1: pt, p2: {...pt}, color, w: strokeWidth };
  }, [isPlaying]);

  const moveDraw = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing.current || !previewRef.current || !currentStroke.current) return;
    const canvas = previewRef.current;
    const ctx    = canvas.getContext('2d')!;
    const pt     = getPoint(canvas, clientX, clientY);
    const s      = currentStroke.current;
    if      (s.kind === 'path')                                                s.pts.push(pt);
    else if (s.kind === 'line' || s.kind === 'ellipse' || s.kind === 'rect') (s as any).p2 = pt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderStroke(ctx, s);
  }, []);

  const endDraw = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;
    const stroke = currentStroke.current;
    currentStroke.current = null;
    if (previewRef.current) {
      const ctx = previewRef.current.getContext('2d')!;
      ctx.clearRect(0, 0, previewRef.current.width, previewRef.current.height);
    }
    // Committing a new stroke clears the redo stack (new branch)
    setFuture([]); futureRef.current = [];
    setStrokes(prev => {
      const next = [...prev, stroke];
      strokesRef.current = next;
      if (committedRef.current) redrawAll(committedRef.current, next);
      return next;
    });
  }, []);

  // ── Synthetic event handlers ─────────────────────────────────────────────

  const onMouseDown  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); e.stopPropagation();
    startDraw(e.clientX, e.clientY);
  }, [startDraw]);

  const onMouseMove  = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    moveDraw(e.clientX, e.clientY);
  }, [moveDraw]);

  const onMouseUp    = useCallback(() => endDraw(), [endDraw]);
  const onMouseLeave = useCallback(() => endDraw(), [endDraw]);

  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) startDraw(t.clientX, t.clientY);
  }, [startDraw]);

  const onTouchMove  = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) moveDraw(t.clientX, t.clientY);
  }, [moveDraw]);

  const onTouchEnd = useCallback(() => endDraw(), [endDraw]);

  return {
    enabled, setEnabled,
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    canUndo: strokes.length > 0,
    canRedo: future.length > 0,
    undo, redo, clear,
    strokes,
    committedRef, previewRef,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
    onTouchStart, onTouchMove, onTouchEnd,
    cursor: CURSOR_MAP[tool],
  };
}
