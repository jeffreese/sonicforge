import type { SonicForgeComposition } from './composition'

export class ValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Composition validation failed:\n${errors.join('\n')}`)
  }
}

export function validate(data: unknown): SonicForgeComposition {
  const errors: string[] = []
  const c = data as Record<string, unknown>

  if (!c || typeof c !== 'object') {
    throw new ValidationError(['Input must be an object'])
  }

  if (c.version !== '1.0') {
    errors.push(`version must be "1.0", got "${c.version}"`)
  }

  // Metadata
  const meta = c.metadata as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object') {
    errors.push('metadata is required')
  } else {
    if (typeof meta.title !== 'string') errors.push('metadata.title must be a string')
    if (typeof meta.bpm !== 'number' || meta.bpm <= 0)
      errors.push('metadata.bpm must be a positive number')
    if (!Array.isArray(meta.timeSignature) || meta.timeSignature.length !== 2) {
      errors.push('metadata.timeSignature must be [number, number]')
    }
    if (typeof meta.key !== 'string') errors.push('metadata.key must be a string')
  }

  // Instruments
  const instruments = c.instruments
  if (!Array.isArray(instruments) || instruments.length === 0) {
    errors.push('instruments must be a non-empty array')
  } else {
    const ids = new Set<string>()
    for (const inst of instruments) {
      if (typeof inst.id !== 'string') errors.push('instrument.id must be a string')
      if (ids.has(inst.id)) errors.push(`duplicate instrument id: "${inst.id}"`)
      ids.add(inst.id)
      if (typeof inst.sample !== 'string')
        errors.push(`instrument "${inst.id}": sample must be a string`)
      const validCategories = ['melodic', 'bass', 'pad', 'drums', 'fx']
      if (!validCategories.includes(inst.category)) {
        errors.push(
          `instrument "${inst.id}": category must be one of ${validCategories.join(', ')}`,
        )
      }
    }
  }

  // Sections
  const sections = c.sections
  if (!Array.isArray(sections) || sections.length === 0) {
    errors.push('sections must be a non-empty array')
  } else {
    const instrumentIds = new Set((instruments as { id: string }[])?.map((i) => i.id) ?? [])
    for (const section of sections) {
      if (typeof section.name !== 'string') errors.push('section.name must be a string')
      if (typeof section.bars !== 'number' || section.bars <= 0) {
        errors.push(`section "${section.name}": bars must be a positive number`)
      }
      if (!Array.isArray(section.tracks)) {
        errors.push(`section "${section.name}": tracks must be an array`)
      } else {
        for (const track of section.tracks) {
          if (!instrumentIds.has(track.instrumentId)) {
            errors.push(`section "${section.name}": unknown instrumentId "${track.instrumentId}"`)
          }
          if (!Array.isArray(track.notes)) {
            errors.push(
              `section "${section.name}", track "${track.instrumentId}": notes must be an array`,
            )
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors)
  }

  return data as SonicForgeComposition
}
