import { EFFECT_TYPES, type SonicForgeComposition } from './composition'

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Composition validation failed:\n${errors.join('\n')}`)
  }
}

const VALID_CATEGORIES = ['melodic', 'bass', 'pad', 'drums', 'fx']
const VALID_SOURCES = ['sampled', 'synth', 'oneshot', 'drums']
const VALID_CURVES = ['step', 'linear', 'exponential']

export function validate(data: unknown): SonicForgeComposition {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    throw new ValidationError(['Input must be an object'])
  }
  const c = data as Record<string, unknown>

  if (c.version !== '1.0') {
    errors.push(`version must be "1.0", got "${c.version}"`)
  }

  validateMetadata(c.metadata, errors)

  const instrumentIds = validateInstruments(c.instruments, errors)

  validateSections(c.sections, instrumentIds, errors)

  validateMasterEffects(c.masterEffects, errors)
  validateAutomation(c.automation, errors)

  const lfoIds = validateLFOs(c.lfos, errors)
  validateModulation(c.modulation, lfoIds, errors)
  validateSidechain(c.sidechain, instrumentIds, errors)

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }

  return data as SonicForgeComposition
}

const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function validateMetadata(meta: unknown, errors: string[]): void {
  if (!meta || typeof meta !== 'object') {
    errors.push('metadata is required')
    return
  }
  const m = meta as Record<string, unknown>
  if (typeof m.title !== 'string') errors.push('metadata.title must be a string')
  if (typeof m.bpm !== 'number' || m.bpm <= 0) {
    errors.push('metadata.bpm must be a positive number')
  }
  if (!Array.isArray(m.timeSignature) || m.timeSignature.length !== 2) {
    errors.push('metadata.timeSignature must be [number, number]')
  }
  if (typeof m.key !== 'string') errors.push('metadata.key must be a string')
  validateTags(m.tags, errors)
}

function validateTags(tags: unknown, errors: string[]): void {
  if (tags === undefined) return // optional
  if (!Array.isArray(tags)) {
    errors.push('metadata.tags must be an array of lowercase-hyphenated strings when present')
    return
  }
  if (tags.length === 0) {
    errors.push(
      'metadata.tags must contain at least one tag when present (omit the field entirely otherwise)',
    )
    return
  }
  const seen = new Set<string>()
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    if (typeof tag !== 'string') {
      errors.push(`metadata.tags[${i}] must be a string`)
      continue
    }
    if (!TAG_PATTERN.test(tag)) {
      errors.push(
        `metadata.tags[${i}] "${tag}" must be lowercase-hyphenated (e.g. "dubstep", "dark-dubstep", "lo-fi")`,
      )
      continue
    }
    if (seen.has(tag)) {
      errors.push(`metadata.tags[${i}] "${tag}" is a duplicate`)
      continue
    }
    seen.add(tag)
  }
}

function validateInstruments(instruments: unknown, errors: string[]): Set<string> {
  const ids = new Set<string>()
  if (!Array.isArray(instruments) || instruments.length === 0) {
    errors.push('instruments must be a non-empty array')
    return ids
  }
  for (const inst of instruments) {
    validateInstrument(inst, ids, errors)
  }
  return ids
}

function validateInstrument(inst: unknown, ids: Set<string>, errors: string[]): void {
  if (!inst || typeof inst !== 'object') {
    errors.push('instrument must be an object')
    return
  }
  const i = inst as Record<string, unknown>

  if (typeof i.id !== 'string') {
    errors.push('instrument.id must be a string')
    return
  }
  if (ids.has(i.id)) errors.push(`duplicate instrument id: "${i.id}"`)
  ids.add(i.id)

  if (!VALID_CATEGORIES.includes(i.category as string)) {
    errors.push(`instrument "${i.id}": category must be one of ${VALID_CATEGORIES.join(', ')}`)
  }

  // Source discriminator: optional, defaults to 'sampled' (or 'drums' if category is drums)
  const source = i.source as string | undefined
  if (source !== undefined && !VALID_SOURCES.includes(source)) {
    errors.push(`instrument "${i.id}": source must be one of ${VALID_SOURCES.join(', ')}`)
  }

  // Presence checks based on source
  const effectiveSource = source ?? (i.category === 'drums' ? 'drums' : 'sampled')

  if (effectiveSource === 'sampled') {
    if (typeof i.sample !== 'string') {
      errors.push(`instrument "${i.id}": sample must be a string for source "sampled"`)
    }
  } else if (effectiveSource === 'synth') {
    if (i.synth === undefined) {
      errors.push(`instrument "${i.id}": synth is required for source "synth"`)
    } else if (typeof i.synth !== 'string' && typeof i.synth !== 'object') {
      errors.push(`instrument "${i.id}": synth must be a preset name or SynthPatch object`)
    }
  } else if (effectiveSource === 'oneshot') {
    if (!i.oneshots || typeof i.oneshots !== 'object') {
      errors.push(`instrument "${i.id}": oneshots is required for source "oneshot"`)
    }
  }
  // 'drums' source requires nothing explicit — existing drum kit is synthesized

  if (i.effects !== undefined) {
    validateEffectsChain(i.effects, `instrument "${i.id}"`, errors)
  }
}

function validateEffectsChain(effects: unknown, context: string, errors: string[]): void {
  if (!Array.isArray(effects)) {
    errors.push(`${context}: effects must be an array`)
    return
  }
  const seenIds = new Set<string>()
  for (const eff of effects) {
    validateEffect(eff, context, errors, seenIds)
  }
}

function validateEffect(
  eff: unknown,
  context: string,
  errors: string[],
  seenIds: Set<string>,
): void {
  if (!eff || typeof eff !== 'object') {
    errors.push(`${context}: effect must be an object`)
    return
  }
  const e = eff as Record<string, unknown>
  if (typeof e.type !== 'string') {
    errors.push(`${context}: effect.type must be a string`)
    return
  }
  if (!EFFECT_TYPES.includes(e.type as (typeof EFFECT_TYPES)[number])) {
    errors.push(`${context}: unknown effect type "${e.type}" (valid: ${EFFECT_TYPES.join(', ')})`)
  }
  if (!e.params || typeof e.params !== 'object') {
    errors.push(`${context}: effect.params must be an object`)
  }
  if (e.id !== undefined) {
    if (typeof e.id !== 'string' || e.id.length === 0) {
      errors.push(`${context}: effect.id must be a non-empty string`)
    } else if (seenIds.has(e.id)) {
      errors.push(`${context}: duplicate effect id "${e.id}" within chain`)
    } else {
      seenIds.add(e.id)
    }
  }
}

function validateSections(sections: unknown, instrumentIds: Set<string>, errors: string[]): void {
  if (!Array.isArray(sections) || sections.length === 0) {
    errors.push('sections must be a non-empty array')
    return
  }
  for (const section of sections) {
    if (!section || typeof section !== 'object') {
      errors.push('section must be an object')
      continue
    }
    const s = section as Record<string, unknown>
    if (typeof s.name !== 'string') errors.push('section.name must be a string')
    if (typeof s.bars !== 'number' || s.bars <= 0) {
      errors.push(`section "${s.name}": bars must be a positive number`)
    }
    if (!Array.isArray(s.tracks)) {
      errors.push(`section "${s.name}": tracks must be an array`)
    } else {
      for (const track of s.tracks) {
        if (!track || typeof track !== 'object') {
          errors.push(`section "${s.name}": track must be an object`)
          continue
        }
        const t = track as Record<string, unknown>
        if (!instrumentIds.has(t.instrumentId as string)) {
          errors.push(`section "${s.name}": unknown instrumentId "${t.instrumentId}"`)
        }
        if (!Array.isArray(t.notes)) {
          errors.push(`section "${s.name}", track "${t.instrumentId}": notes must be an array`)
        }
      }
    }
  }
}

function validateMasterEffects(masterEffects: unknown, errors: string[]): void {
  if (masterEffects === undefined) return
  validateEffectsChain(masterEffects, 'masterEffects', errors)
}

function validateAutomation(automation: unknown, errors: string[]): void {
  if (automation === undefined) return
  if (!Array.isArray(automation)) {
    errors.push('automation must be an array')
    return
  }
  for (const lane of automation) {
    if (!lane || typeof lane !== 'object') {
      errors.push('automation lane must be an object')
      continue
    }
    const l = lane as Record<string, unknown>
    if (typeof l.target !== 'string' || l.target.length === 0) {
      errors.push('automation lane target must be a non-empty string')
    }
    if (!Array.isArray(l.points)) {
      errors.push(`automation lane "${l.target}": points must be an array`)
      continue
    }
    for (const point of l.points) {
      if (!point || typeof point !== 'object') {
        errors.push(`automation lane "${l.target}": point must be an object`)
        continue
      }
      const p = point as Record<string, unknown>
      if (typeof p.time !== 'string' && typeof p.time !== 'number') {
        errors.push(`automation lane "${l.target}": point.time must be string or number`)
      }
      if (typeof p.value !== 'number') {
        errors.push(`automation lane "${l.target}": point.value must be a number`)
      }
      if (p.curve !== undefined && !VALID_CURVES.includes(p.curve as string)) {
        errors.push(
          `automation lane "${l.target}": curve must be one of ${VALID_CURVES.join(', ')}`,
        )
      }
    }
  }
}

function validateLFOs(lfos: unknown, errors: string[]): Set<string> {
  const ids = new Set<string>()
  if (lfos === undefined) return ids
  if (!Array.isArray(lfos)) {
    errors.push('lfos must be an array')
    return ids
  }
  for (const lfo of lfos) {
    if (!lfo || typeof lfo !== 'object') {
      errors.push('lfo must be an object')
      continue
    }
    const l = lfo as Record<string, unknown>
    if (typeof l.id !== 'string') {
      errors.push('lfo.id must be a string')
      continue
    }
    if (ids.has(l.id)) {
      errors.push(`duplicate LFO id: "${l.id}"`)
    }
    ids.add(l.id)
    if (typeof l.frequency !== 'number' && typeof l.frequency !== 'string') {
      errors.push(`lfo "${l.id}": frequency must be a number or string`)
    }
    if (typeof l.min !== 'number') errors.push(`lfo "${l.id}": min must be a number`)
    if (typeof l.max !== 'number') errors.push(`lfo "${l.id}": max must be a number`)
  }
  return ids
}

function validateModulation(modulation: unknown, lfoIds: Set<string>, errors: string[]): void {
  if (modulation === undefined) return
  if (!Array.isArray(modulation)) {
    errors.push('modulation must be an array')
    return
  }
  for (const route of modulation) {
    if (!route || typeof route !== 'object') {
      errors.push('modulation route must be an object')
      continue
    }
    const r = route as Record<string, unknown>
    if (typeof r.source !== 'string') {
      errors.push('modulation route source must be a string')
      continue
    }
    if (!lfoIds.has(r.source)) {
      errors.push(`modulation route source "${r.source}" does not match any LFO id`)
    }
    if (typeof r.target !== 'string' || r.target.length === 0) {
      errors.push(`modulation route from "${r.source}": target must be a non-empty string`)
    }
  }
}

function validateSidechain(sidechain: unknown, instrumentIds: Set<string>, errors: string[]): void {
  if (sidechain === undefined) return
  if (!Array.isArray(sidechain)) {
    errors.push('sidechain must be an array')
    return
  }
  for (const config of sidechain) {
    if (!config || typeof config !== 'object') {
      errors.push('sidechain config must be an object')
      continue
    }
    const s = config as Record<string, unknown>
    if (typeof s.source !== 'string' || !instrumentIds.has(s.source)) {
      errors.push(`sidechain source "${s.source}" does not match any instrument id`)
    }
    if (typeof s.target !== 'string' || !instrumentIds.has(s.target)) {
      errors.push(`sidechain target "${s.target}" does not match any instrument id`)
    }
    if (typeof s.amount !== 'number' || s.amount < 0 || s.amount > 1) {
      errors.push(`sidechain "${s.source}→${s.target}": amount must be a number 0–1`)
    }
  }
}
