<div align="center">

# 🥏 DG Form Analyzer

### Side-by-side disc golf video analysis — in the browser, no install required.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![No Backend](https://img.shields.io/badge/backend-none-success?style=flat-square)](#)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20deps-2-brightgreen?style=flat-square)](#)
[![Version](https://img.shields.io/badge/version-1.0-orange?style=flat-square)](#)

> *Load two videos. Sync them. Slow them down. Draw on them. Level up your game.*

</div>

---

## ✨ What Is This?

Improving disc golf form the old-fashioned way meant opening two video players side by side, manually scrubbing both to roughly the same moment, and squinting at your screen hoping to spot what separates your throw from a world-class one. It was tedious, imprecise, and kind of miserable.

**DG Form Analyzer** solves all of that in a single browser tab. Drop two clips — yourself and a pro, or before and after — and you have a fully synchronized, frame-accurate comparison tool with zoom, pan, playback speed control, and a full drawing overlay for annotation. No account. No upload. No server. Everything runs locally on your device.

---

## 🚀 Features

### 🎬 Dual Video Players
- Load **any browser-supported video format** (MP4, MOV, WEBM) directly from your device
- Drag-and-drop onto either player — or drag a clip from one player to the other to **swap them**
- Responsive layout: **side by side on desktop**, stacked vertically on mobile with controls naturally between the players
- **16:9 viewport** with clean black letterboxing

### 🔗 Sync System
- Set a **sync point** on each player at any meaningful moment (top of reach-back, release point, follow-through peak — whatever matters)
- The global scrubber then drives **both videos simultaneously** from their respective sync points as a shared offset
- Real-time **drift detection**: a status chip turns amber and shows the exact ms of drift if the videos fall out of sync
- Hit **Enter** (or the Sync button) to snap both players back to their sync points instantly
- Remove a sync point at any time — playback halts so you don't lose your place

### 🎛️ Playback Controls
- **Global play/pause** drives both players at once
- **Per-player play/pause** for independent control
- **Playback speed**: 0.1× · 0.25× · 0.5× · 0.75× · 1× · 1.25× · 1.5× · 2×
- Per-player rewind-to-start and jump-to-sync-point buttons
- **Individual scrubbers** for fine per-player positioning
- Global scrubber handles the offset math automatically once synced

### 🔍 Zoom & Pan
- **Scroll to zoom** into either player (up to 5×) — only the player your cursor is over is affected
- **Click and drag** to pan when zoomed in
- **Trackpad pinch-to-zoom** supported natively
- Video borders never enter the viewport — clamped so there's never dead space
- A **zoom badge** shows current magnification; click it to reset to 1:1
- Only available while paused — zoom is disabled during playback to prevent accidents

### ✏️ Drawing Overlay
- Toggle **draw mode** per player with the ✎ button in the player header
- Full toolkit: **Pencil**, **Line**, **Arrow**, **Ellipse**, **Rectangle**, **Eraser**
- **12-color palette** + a custom color picker (every color you could want)
- **4 stroke widths** with visual dot selectors
- **Undo / Redo** per player — full history stack; new strokes clear the redo branch
- **Clear** a single player or **Clear Both** in one click
- Annotations are anchored to the viewport (they stay where you drew them, regardless of zoom)
- Drawing is disabled during playback — annotations persist through play/pause cycles
- Touch support for single-finger drawing on tablets

### ⌨️ Full Keyboard Control *(desktop)*
Every meaningful action is wired to a key. See the [Keyboard Reference](#-keyboard-reference) below or press **Shift+?** inside the app.

### 🌗 Dark / Light Theme
Persistent theme toggle — defaults to dark (obviously).

### 📐 Fully Responsive
- Desktop: side-by-side players, global controls below
- Mobile / narrow: Player A → Global Controls → Player B (vertically stacked)
- Global controls section is **collapsible** on mobile — collapse to just play, sync, and the scrubber
- All sizes use `dvh`-based tokens so browser zoom doesn't break the layout

---

## ⌨️ Keyboard Reference

### Global

| Key | Action |
|-----|--------|
| `Space` | Play / Pause both players |
| `Enter` | Sync to sync points (or rewind both to 0:00 if unset) |
| `← →` | Seek both players one frame (~1/60 s) · `Shift` = 1 s jump |
| `[` `]` | Speed down / Speed up |
| `\` | Reset speed to 1× |
| `Shift` + `?` | Toggle keyboard help |

### Player A — Left Hand

| Key | Action |
|-----|--------|
| `W` | Play / Pause |
| `Q` | Rewind to start |
| `E` | Jump to sync point |
| `S` | Set sync point |
| `Shift` + `S` | Clear sync point |
| `A` `D` | Seek ← / → (0.1 s · `Shift` = 1 s) |
| `Z` | Undo drawing stroke |
| `Shift` + `Z` | Redo drawing stroke |

### Player B — Right Hand

| Key | Action |
|-----|--------|
| `I` | Play / Pause |
| `U` | Rewind to start |
| `O` | Jump to sync point |
| `K` | Set sync point |
| `Shift` + `K` | Clear sync point |
| `J` `L` | Seek ← / → (0.1 s · `Shift` = 1 s) |
| `N` | Undo drawing stroke |
| `Shift` + `N` | Redo drawing stroke |

> The QWEASD / UIOJKL split is intentional — left hand controls Player A, right hand controls Player B. Both hands can operate simultaneously.

---

## 🛠️ Getting Started

```bash
# Clone
git clone https://github.com/your-username/dg-video-scrubber.git
cd dg-video-scrubber

# Install (only dev tooling — no runtime deps beyond React)
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

Open `http://localhost:5173` and load two videos. That's it.

> **No environment variables. No API keys. No database. No server.** Everything runs in the browser — videos never leave your machine.

---

## 🏗️ Architecture

This is a **zero-backend single-page app** — intentionally so. The entire feature set is delivered through the browser's native video APIs and Canvas API.

```
src/
├── hooks/
│   ├── useVideoPlayer.ts       # Per-player state machine (play/pause/seek/sync)
│   ├── useVideoTransform.ts    # Zoom & pan — wheel/pinch/drag, clamp geometry
│   ├── useDrawing.ts           # Drawing overlay — full history (undo/redo), tool/color/width
│   ├── useKeyboardControls.ts  # Global keyboard handler, registered once via stable-ref pattern
│   └── useTheme.ts             # Dark/light theme with localStorage persistence
│
├── components/
│   ├── VideoPanel.tsx          # Individual player card (viewport + controls)
│   ├── VideoPanel.css
│   ├── DrawingCanvasLayer.tsx  # Two stacked canvases (committed + preview), ResizeObserver
│   ├── DrawingToolbar.tsx      # Tool/color/width/action toolbar
│   ├── Drawing.css
│   ├── GlobalControls.tsx      # Sync scrubber, drift detection, global speed
│   ├── GlobalControls.css
│   ├── KeyboardHelp.tsx        # Help modal (Shift+?)
│   ├── KeyboardHelp.css
│   └── ThemeToggle.tsx
│
├── App.tsx                     # Grid layout, state orchestration, drawing state lifted here
└── App.css
```

### A Few Notable Technical Decisions

**Drawing state lives in `App.tsx`** (not inside each `VideoPanel`) — this lets the keyboard hook access `undo`/`redo` for both players without prop-drilling callbacks upward.

**Two-canvas drawing approach**: a `committed` canvas holds all finished strokes; a `preview` canvas renders the live in-progress stroke. On mouse-up, the preview is composited into committed and cleared. This avoids re-rendering all strokes on every mouse-move frame.

**Stable-ref keyboard pattern**: the keyboard listener is registered exactly once (`useEffect([], [])`) and reads all mutable values through a `useRef` that's kept current by a separate effect. No stale closures, no listener re-registration on every render.

**`dvh`-based size tokens**: all font sizes and UI heights are defined as `dvh` fractions in CSS custom properties so browser zoom scales them proportionally to the physical screen rather than blowing up the layout.

**Zoom uses `getBoundingClientRect()`**: the CSS transform doesn't affect layout — `getBoundingClientRect()` returns the post-transform position, so mouse → canvas coordinate mapping works correctly at any zoom level without inverse matrix math.

---

## 📋 Roadmap Ideas

- [ ] Export annotated frame as PNG
- [ ] Multiple annotation layers (toggle visibility per layer)
- [ ] Angle / protractor measurement tool
- [ ] Video trimming / clip selection
- [ ] Share-via-URL with encoded sync metadata
- [ ] PWA / offline support

---

## 👤 About

Built as a portfolio project by a developer who actually plays disc golf and got tired of the manual comparison workflow.

If you're a **hiring manager** reading this: this project was built iteratively, feature by feature, with a strong focus on UX polish, responsive design, and clean architecture — no frameworks beyond React, no UI libraries, no shortcuts. Every interaction was designed from scratch. The [commit history](../../commits) tells the story.

If you're a **disc golfer** reading this: just load two videos and go rip.

---

<div align="center">

**v1.0** · Built with React 19 + TypeScript + Vite · Runs entirely in your browser

*No data collected. No videos uploaded. Ever.*

</div>
