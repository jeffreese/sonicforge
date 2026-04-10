import * as Tone from 'tone'
import type { Metadata, Note, Track } from '../schema/composition'
import { parseNote } from '../util/music'
import { durationToSeconds } from '../util/timing'
import type { LoadedInstrument } from './InstrumentLoader'
import { getDrumNote } from './InstrumentLoader'
import type { SectionOffset } from './Transport'
import { type HumanizeConfig, humanizeNote } from './humanize'

function applyArticulation(
  note: Note,
  baseDuration: number,
  baseVelocity: number,
): { duration: number; velocity: number } {
  let duration = baseDuration
  let velocity = baseVelocity

  switch (note.articulation) {
    case 'staccato':
      duration *= 0.5
      break
    case 'legato':
      duration *= 1.1
      break
    case 'accent':
      velocity = Math.min(1, velocity * 1.3)
      break
    case 'ghost':
      velocity *= 0.4
      break
    case 'tenuto':
      // full duration, no change
      break
  }

  return { duration, velocity }
}

export class TrackPlayer {
  private scheduledEvents: number[] = []
  private humanize: HumanizeConfig = { amount: 0 }

  constructor(
    private instrument: LoadedInstrument,
    private metadata: Metadata,
  ) {}

  /** Set humanization config for this track player. */
  setHumanize(config: HumanizeConfig): void {
    this.humanize = config
  }

  /**
   * Schedule all notes for a track within a section.
   */
  scheduleTrack(track: Track, sectionOffset: SectionOffset): void {
    const { section, startBar } = sectionOffset
    const repeats = section.repeat ?? 1
    const bpm = this.metadata.bpm
    const beatsPerBar = this.metadata.timeSignature[0]
    const beatDuration = 60 / bpm
    const baseBeatDuration = beatDuration * (4 / this.metadata.timeSignature[1])

    for (let rep = 0; rep < repeats; rep++) {
      const repBarOffset = startBar + rep * section.bars

      for (let noteIndex = 0; noteIndex < track.notes.length; noteIndex++) {
        const note = track.notes[noteIndex]
        if (note.pitch === 'rest') continue

        // Parse time "bar:beat:sixteenth"
        const timeParts = note.time.split(':').map(Number)
        const noteBar = (timeParts[0] ?? 0) + repBarOffset
        const noteBeat = timeParts[1] ?? 0
        const noteSixteenth = timeParts[2] ?? 0

        const timeInSeconds =
          (noteBar * beatsPerBar + noteBeat + noteSixteenth / 4) * baseBeatDuration

        const baseDuration = durationToSeconds(note.duration, bpm)
        const baseVelocity = (note.velocity ?? 80) / 127

        const { duration, velocity } = applyArticulation(note, baseDuration, baseVelocity)

        // Apply humanization
        const offsets = humanizeNote(
          noteIndex,
          track.instrumentId,
          rep,
          this.humanize,
          note.articulation,
        )
        const humanizedTime = Math.max(0, timeInSeconds + offsets.timingOffset)
        const humanizedVelocity = Math.max(
          1 / 127,
          Math.min(1, velocity * offsets.velocityMultiplier),
        )

        // Determine the pitch to play based on instrument mode.
        //   'drum'    → translate hit name to MIDI note for DrumKit
        //   'oneshot' → pass hit name through verbatim to OneShotInstrument
        //   'pitched' → parse as note name (e.g. "C4") for melodic instruments
        let pitch: string
        switch (this.instrument.mode) {
          case 'drum': {
            const drumNote = getDrumNote(note.pitch)
            if (!drumNote) continue
            pitch = drumNote
            break
          }
          case 'oneshot':
            pitch = note.pitch
            break
          default: {
            const parsed = parseNote(note.pitch)
            if (!parsed) continue
            pitch = parsed.name + parsed.octave
            break
          }
        }

        // Schedule with Tone.Transport
        const eventId = Tone.getTransport().schedule((time) => {
          this.instrument.sampler.triggerAttackRelease(pitch, duration, time, humanizedVelocity)
        }, humanizedTime)

        this.scheduledEvents.push(eventId)
      }
    }
  }

  dispose(): void {
    for (const id of this.scheduledEvents) {
      Tone.getTransport().clear(id)
    }
    this.scheduledEvents = []
  }
}
