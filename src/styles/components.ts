/**
 * Semantic style maps — imported by Lit components instead of raw Tailwind classes.
 * See ADR-002 for rationale. Update this file when adding new UI patterns.
 */

export const surface = {
  base: 'bg-surface text-on-surface',
  elevated: 'bg-surface-elevated text-on-surface shadow-md',
  interactive: 'bg-surface hover:bg-surface-hover cursor-pointer',
}

export const btn = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover px-4 py-2 rounded-lg font-medium transition-colors',
  ghost:
    'text-muted hover:text-on-surface hover:bg-surface-hover px-3 py-1.5 rounded transition-colors',
  icon: 'text-muted hover:text-on-surface hover:bg-surface-hover p-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
  danger:
    'bg-error text-on-primary hover:bg-error/80 px-4 py-2 rounded-lg font-medium transition-colors',
}

export const input = {
  text: 'bg-surface-elevated text-on-surface border border-border rounded-lg px-3 py-2 focus:border-primary focus:outline-none',
  textarea:
    'bg-surface-elevated text-on-surface border border-border rounded-lg px-3 py-2 focus:border-primary focus:outline-none resize-y',
}

export const mixer = {
  container: 'bg-surface border-t border-border px-4 py-3',
  // Wrapper that owns horizontal scrolling. Must be a separate element from
  // the flex row below — putting overflow-x on the flex row itself forces
  // overflow-y to auto (per CSS spec), turning the row into a dual-axis
  // scroll container and breaking `items-stretch` on the cards whenever a
  // horizontal scrollbar is present.
  stripScroll: 'overflow-x-auto',
  strip: 'flex gap-3 items-stretch',
  channel: 'bg-surface-elevated border border-border rounded-lg p-3 min-w-[160px]',
  channelName: 'text-on-surface text-sm font-medium truncate',
  value: 'font-mono text-xs text-muted tabular-nums w-8 text-right',
  controlRow: 'flex items-center gap-2',
  buttonRow: 'flex gap-1 mt-2',
  slider: 'accent-primary flex-1 min-w-0',
  label: 'text-muted text-xs uppercase tracking-wider w-6',
  muteBtn:
    'px-2 py-0.5 rounded text-xs font-medium transition-colors text-muted hover:text-on-surface hover:bg-surface-hover',
  muteBtnActive:
    'px-2 py-0.5 rounded text-xs font-medium transition-colors bg-error text-on-primary',
  soloBtn:
    'px-2 py-0.5 rounded text-xs font-medium transition-colors text-muted hover:text-on-surface hover:bg-surface-hover',
  soloBtnActive:
    'px-2 py-0.5 rounded text-xs font-medium transition-colors bg-warning text-on-primary',
  master: 'bg-surface-elevated border border-primary/50 rounded-lg p-3 min-w-[160px]',
  masterLabel: 'text-primary text-sm font-medium',
  // Meter bar — vertical level indicator beside the channel controls.
  meterContainer: 'relative w-2 h-16 bg-surface rounded overflow-hidden border border-border',
  meterFill: 'absolute bottom-0 left-0 right-0 transition-[height] duration-75 ease-out',
  meterGreen: 'bg-success',
  meterYellow: 'bg-warning',
  meterRed: 'bg-error',
  // Peak hold indicator — thin horizontal line tracking the recent peak.
  meterPeak:
    'absolute left-0 right-0 h-[2px] bg-on-surface/80 transition-[bottom] duration-100 ease-out',
  meterRow: 'flex gap-2 items-stretch',
  // Column that wraps the meter bar + numeric dB readout below it.
  meterColumn: 'flex flex-col items-center gap-1',
  // Small monospace text under the meter showing current dB level.
  // Fixed width so the changing digit count (e.g. "-6 dB" → "-60 dB" → "-∞")
  // can't push the meter column around and jitter the surrounding layout.
  meterReadout:
    'font-mono text-[10px] text-muted tabular-nums leading-none w-12 text-center whitespace-nowrap',
}

export const transport = {
  bar: 'bg-surface-elevated border-b border-border px-4 py-2 flex items-center gap-4',
  position: 'text-on-surface font-mono text-lg tabular-nums',
  status: 'text-muted text-sm',
}

export const panel = {
  base: 'bg-surface border border-border rounded-lg',
  header:
    'border-b border-border px-4 py-2 text-muted text-sm font-medium uppercase tracking-wider',
  body: 'p-4',
}

export const text = {
  primary: 'text-on-surface',
  muted: 'text-muted',
  heading: 'text-on-surface font-semibold',
  mono: 'font-mono text-on-surface',
}

export const state = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

/**
 * Editor note palette — distinct hues per track for visual separation on the grid.
 * Cycles for compositions with many tracks.
 */
export const loader = {
  dropzone:
    'absolute inset-0 border-2 border-dashed border-primary/50 bg-primary/5 rounded-lg flex items-center justify-center pointer-events-none',
  dropzoneText: 'text-primary font-medium text-lg',
}

export const explorer = {
  container: 'bg-surface border-t border-border',
  header:
    'flex items-center justify-between px-4 py-2 cursor-pointer select-none hover:bg-surface-hover transition-colors',
  heading: 'text-on-surface text-sm font-medium uppercase tracking-wider',
  toggle: 'text-muted text-xs hover:text-on-surface transition-colors px-2 py-0.5 rounded',
  content: 'px-4 pb-3',
  controls: 'flex items-center gap-3 mb-3',
  search:
    'bg-surface-elevated text-on-surface border border-border rounded px-2 py-1 text-sm flex-1 focus:border-primary focus:outline-none',
  velRow: 'flex items-center gap-2',
  velLabel: 'text-muted text-xs uppercase tracking-wider',
  velSlider: 'accent-primary w-20',
  velValue: 'font-mono text-xs text-muted tabular-nums w-6 text-right',
  grid: 'max-h-64 overflow-y-auto space-y-3',
  category: '',
  categoryHeading:
    'text-muted text-xs font-medium uppercase tracking-wider mb-1 sticky top-0 bg-surface py-1',
  instrumentList: 'flex flex-wrap gap-1',
  instrumentBtn:
    'px-2 py-1 rounded text-xs transition-colors bg-surface-elevated text-muted hover:text-on-surface hover:bg-surface-hover',
  instrumentBtnActive: 'px-2 py-1 rounded text-xs transition-colors bg-primary text-on-primary',
  instrumentBtnLoading:
    'px-2 py-1 rounded text-xs transition-colors bg-surface-elevated text-muted opacity-60 animate-pulse',
  drumBtn:
    'px-2 py-1 rounded text-xs transition-colors bg-secondary/20 text-secondary hover:bg-secondary/30',
  drumBtnActive: 'px-2 py-1 rounded text-xs transition-colors bg-secondary text-on-primary',
}

export const keyboard = {
  section: 'mt-3 opacity-50 transition-opacity',
  sectionEnabled: 'mt-3 opacity-100 transition-opacity',
  header: 'flex items-center gap-3 mb-2',
  label: 'text-muted text-xs uppercase tracking-wider',
  octaveControls: 'flex items-center gap-1',
  octaveBtn:
    'text-muted hover:text-on-surface hover:bg-surface-hover w-6 h-6 rounded text-sm flex items-center justify-center transition-colors',
  octaveDisplay: 'font-mono text-xs text-on-surface w-6 text-center',
  status: 'text-muted text-xs ml-auto',
  statusActive: 'text-primary text-xs ml-auto font-medium',
  piano: 'relative h-24 flex',
  whiteKey:
    'relative flex-1 bg-white border border-border rounded-b flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors',
  whiteKeyPressed:
    'relative flex-1 bg-primary/30 border border-primary rounded-b flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors',
  blackKey:
    'absolute top-0 w-[6%] h-[60%] bg-gray-800 border border-gray-700 rounded-b z-10 flex items-end justify-center pb-1 cursor-pointer transition-colors',
  blackKeyPressed:
    'absolute top-0 w-[6%] h-[60%] bg-primary border border-primary rounded-b z-10 flex items-end justify-center pb-1 cursor-pointer transition-colors',
  keyLabel: 'text-[10px] text-gray-400',
  keyNote: 'text-[9px] text-gray-500',
}

export const picker = {
  overlay: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center',
  panel:
    'bg-surface-elevated border border-border rounded-lg shadow-lg w-80 max-h-[70vh] flex flex-col',
  header: 'flex items-center justify-between px-4 py-3 border-b border-border',
  heading: 'text-on-surface text-sm font-medium',
  closeBtn:
    'text-muted hover:text-on-surface hover:bg-surface-hover w-6 h-6 rounded flex items-center justify-center transition-colors',
  search:
    'bg-surface text-on-surface border border-border rounded px-3 py-1.5 text-sm mx-4 mt-3 focus:border-primary focus:outline-none',
  list: 'overflow-y-auto flex-1 px-4 py-2',
  category: '',
  categoryLabel: 'text-muted text-xs font-medium uppercase tracking-wider mt-3 mb-1 first:mt-0',
  item: 'flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm text-on-surface hover:bg-surface-hover transition-colors',
  itemCurrent:
    'flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm text-primary bg-primary/10 font-medium',
  previewBtn:
    'text-muted hover:text-on-surface text-xs px-1.5 py-0.5 rounded hover:bg-surface-hover transition-colors',
}

export const app = {
  shell: 'bg-surface text-on-surface h-screen flex flex-col overflow-hidden',
  header: 'flex-shrink-0',
  center: 'flex-1 min-h-0 overflow-hidden flex flex-col',
  footer: 'flex-shrink-0 overflow-y-auto',
  resizeHandle:
    'flex-shrink-0 h-1.5 cursor-row-resize bg-border/50 hover:bg-primary/50 transition-colors relative group',
  resizeHandleActive: 'flex-shrink-0 h-1.5 cursor-row-resize bg-primary/70 relative group',
  controlsLegend:
    'flex items-center justify-center gap-4 px-4 py-1.5 border-t border-border text-muted text-[11px]',
  controlsKey: 'text-on-surface/70 font-medium',
}

export const arrangement = {
  container: 'h-full flex flex-col bg-surface border-y border-border px-4 py-2',
  heading: 'text-on-surface text-sm font-medium mb-1 flex-shrink-0',
  // Horizontal flex row: track headers on the left, canvas filling the rest.
  body: 'flex flex-row flex-1 min-h-0 gap-2',
  canvas: 'block h-full flex-1 min-w-0 cursor-pointer',
  // Left-side track header column. Fixed width so the canvas can compute
  // its available horizontal space predictably.
  trackHeaders: 'flex flex-col gap-1 w-40 flex-shrink-0 overflow-y-auto py-1',
  // "All Tracks" row at the top of the sidebar — clears focus.
  trackHeaderAll:
    'px-2 py-1 rounded text-xs text-left transition-colors text-muted hover:text-on-surface hover:bg-surface-hover border border-border',
  trackHeaderAllActive:
    'px-2 py-1 rounded text-xs text-left transition-colors text-on-surface bg-surface-hover border border-border',
  // Individual instrument row — color swatch + name, clickable to focus.
  trackHeader:
    'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors bg-surface-elevated text-muted hover:text-on-surface hover:bg-surface-hover',
  trackHeaderActive:
    'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors bg-primary text-on-primary',
  trackHeaderSwatch: 'inline-block w-3 h-3 rounded-sm flex-shrink-0',
  trackHeaderName: 'truncate min-w-0',
}

export const notePalette = [
  'bg-indigo-500/70',
  'bg-purple-500/70',
  'bg-pink-500/70',
  'bg-cyan-500/70',
  'bg-amber-500/70',
  'bg-emerald-500/70',
  'bg-rose-500/70',
  'bg-sky-500/70',
]
