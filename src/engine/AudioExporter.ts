/**
 * Audio export — captures the composition's audio output via Tone.Recorder,
 * then decodes the result to raw PCM and encodes it as a lossless WAV file.
 *
 * Two-stage approach:
 * 1. Tone.Recorder (wraps MediaRecorder) captures the real-time output as
 *    a compressed blob (WebM/OGG/M4A depending on browser).
 * 2. The compressed blob is decoded via AudioContext.decodeAudioData() to
 *    get raw Float32 PCM, which is then encoded as 16-bit stereo WAV.
 *
 * This gives us reliable capture (Tone.Recorder handles all the audio graph
 * tapping) with lossless WAV output (the decode→re-encode round-trip is
 * transparent for all practical purposes at 16-bit depth).
 */

import * as Tone from 'tone'

export type ExportState = 'idle' | 'exporting' | 'encoding' | 'done' | 'error'

export class AudioExporter {
  private recorder: Tone.Recorder | null = null
  private _state: ExportState = 'idle'

  get state(): ExportState {
    return this._state
  }

  /**
   * Start recording the audio output. Call before Engine.play().
   */
  async startRecording(): Promise<void> {
    if (this._state === 'exporting') return

    this.recorder = new Tone.Recorder()
    Tone.getDestination().connect(this.recorder)
    await this.recorder.start()
    this._state = 'exporting'
  }

  /**
   * Stop recording, decode the captured audio, and return a WAV Blob.
   */
  async stopRecording(): Promise<Blob> {
    if (!this.recorder || this._state !== 'exporting') {
      throw new Error('AudioExporter: not currently recording')
    }

    // Get the compressed blob from MediaRecorder
    const compressedBlob = await this.recorder.stop()
    Tone.getDestination().disconnect(this.recorder)
    this.recorder.dispose()
    this.recorder = null

    this._state = 'encoding'

    // Decode to raw PCM via the Web Audio API
    const arrayBuffer = await compressedBlob.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    await audioCtx.close()

    // Encode as WAV
    const wavBlob = encodeWavFromAudioBuffer(audioBuffer)
    this._state = 'done'
    return wavBlob
  }

  cancel(): void {
    if (this.recorder) {
      try {
        this.recorder.stop()
      } catch {
        // May already be stopped
      }
      try {
        Tone.getDestination().disconnect(this.recorder)
      } catch {
        // May already be disconnected
      }
      this.recorder.dispose()
      this.recorder = null
    }
    this._state = 'idle'
  }

  dispose(): void {
    this.cancel()
  }
}

// ─── WAV encoder ──────────────────────────────────────────────────────────

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function clamp16(sample: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
}

/**
 * Encode an AudioBuffer as a 16-bit stereo WAV file.
 * Handles mono input by duplicating to both channels.
 */
function encodeWavFromAudioBuffer(audioBuffer: AudioBuffer): Blob {
  const sampleRate = audioBuffer.sampleRate
  const numSamples = audioBuffer.length
  const numChannels = 2 // always stereo output
  const bytesPerSample = 2 // 16-bit

  const left = audioBuffer.getChannelData(0)
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

  const dataLength = numSamples * numChannels * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true)
  view.setUint16(32, numChannels * bytesPerSample, true)
  view.setUint16(34, bytesPerSample * 8, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // Interleaved 16-bit PCM
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(offset, clamp16(left[i]), true)
    offset += 2
    view.setInt16(offset, clamp16(right[i]), true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Trigger a browser download of a Blob with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 100)
}
