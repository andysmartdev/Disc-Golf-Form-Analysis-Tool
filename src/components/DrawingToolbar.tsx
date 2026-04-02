import type { UseDrawingReturn, DrawTool } from '../hooks/useDrawing';
import { PRESET_COLORS, PRESET_WIDTHS } from '../hooks/useDrawing';
import type { Side } from '../types';

interface Props {
  drawing: UseDrawingReturn;
  side: Side;
  onClearBoth: () => void;
}

type ToolDef = { id: DrawTool; label: string; title: string };

const TOOLS: ToolDef[] = [
  { id: 'pencil', label: '✎\uFE0E', title: 'Pencil — freeform draw' },
  { id: 'line',   label: '╱\uFE0E', title: 'Line' },
  { id: 'arrow',  label: '↗\uFE0E', title: 'Arrow' },
  { id: 'circle', label: '◯\uFE0E', title: 'Ellipse' },
  { id: 'rect',   label: '▭\uFE0E', title: 'Rectangle' },
  { id: 'eraser', label: '⌫\uFE0E', title: 'Eraser (3× stroke width)' },
];

export function DrawingToolbar({ drawing, side, onClearBoth }: Props) {
  const {
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    canUndo, canRedo, undo, redo, clear,
  } = drawing;

  const undoKey = side === 'left' ? 'Z' : 'N';
  const redoKey = side === 'left' ? 'Shift+Z' : 'Shift+N';

  return (
    <div className="drawing-toolbar" role="toolbar" aria-label="Drawing tools">

      {/* ── Tool selector ── */}
      <div className="drawing-toolbar__group drawing-toolbar__tools">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`drawing-btn drawing-btn--tool${tool === t.id ? ' drawing-btn--active' : ''}`}
            onClick={() => setTool(t.id)}
            title={t.title}
            aria-pressed={tool === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="drawing-toolbar__sep" />

      {/* ── Color palette ── */}
      <div className="drawing-toolbar__group drawing-toolbar__colors">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            className={`drawing-btn drawing-btn--color${color === c ? ' drawing-btn--color-active' : ''}`}
            style={{ '--swatch': c } as React.CSSProperties}
            onClick={() => setColor(c)}
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
          />
        ))}
        {/* Custom color picker */}
        <label
          className="drawing-btn drawing-btn--color drawing-btn--color-custom"
          title="Custom color"
          aria-label="Pick custom color"
        >
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            style={{ display: 'none' }}
          />
          +
        </label>
      </div>

      <div className="drawing-toolbar__sep" />

      {/* ── Stroke width ── */}
      <div className="drawing-toolbar__group drawing-toolbar__widths">
        {PRESET_WIDTHS.map(w => (
          <button
            key={w}
            className={`drawing-btn drawing-btn--width${strokeWidth === w ? ' drawing-btn--active' : ''}`}
            onClick={() => setStrokeWidth(w)}
            title={`Stroke width: ${w}px`}
            aria-pressed={strokeWidth === w}
          >
            <span
              className="drawing-btn__dot"
              style={{ width: `${Math.min(w * 1.6, 18)}px`, height: `${Math.min(w * 1.6, 18)}px` }}
            />
          </button>
        ))}
      </div>

      <div className="drawing-toolbar__sep" />

      {/* ── Actions ── */}
      <div className="drawing-toolbar__group drawing-toolbar__actions">
        <button
          className="drawing-btn drawing-btn--action"
          onClick={undo}
          disabled={!canUndo}
          title={`Undo last stroke (${undoKey})`}
        >
          ↩{'\uFE0E'} Undo
        </button>
        <button
          className="drawing-btn drawing-btn--action"
          onClick={redo}
          disabled={!canRedo}
          title={`Redo stroke (${redoKey})`}
        >
          ↪{'\uFE0E'} Redo
        </button>
        <button
          className="drawing-btn drawing-btn--action"
          onClick={clear}
          title="Clear this player's drawings"
        >
          ✕{'\uFE0E'} Clear
        </button>
        <button
          className="drawing-btn drawing-btn--action drawing-btn--clear-both"
          onClick={onClearBoth}
          title="Clear drawings on both players"
        >
          ✕✕{'\uFE0E'} Both
        </button>
      </div>
    </div>
  );
}
