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
  channel: 'bg-surface-elevated border border-border rounded-lg p-3',
  slider: 'accent-primary',
  label: 'text-muted text-xs uppercase tracking-wider',
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
