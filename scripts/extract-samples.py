#!/usr/bin/env python3
"""
Extract instrument samples from an SF2 soundfont file.

Uses fluidsynth to render individual notes and ffmpeg to convert to OGG.
Generates ~20 notes per instrument (every 3 semitones from C2 to C7).

Prerequisites:
    brew install fluidsynth ffmpeg
    pip install midiutil

Usage:
    python scripts/extract-samples.py path/to/soundfont.sf2
    python scripts/extract-samples.py path/to/soundfont.sf2 --output public/samples
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

from midiutil import MIDIFile

# GM program numbers for our instrument registry (matching src/data/gm-instruments.ts)
GM_INSTRUMENTS = {
    "acoustic_grand_piano": 0,
    "bright_acoustic_piano": 1,
    "electric_grand_piano": 2,
    "honkytonk_piano": 3,
    "electric_piano_1": 4,
    "electric_piano_2": 5,
    "harpsichord": 6,
    "clavinet": 7,
    "celesta": 8,
    "glockenspiel": 9,
    "music_box": 10,
    "vibraphone": 11,
    "marimba": 12,
    "xylophone": 13,
    "tubular_bells": 14,
    "drawbar_organ": 16,
    "percussive_organ": 17,
    "rock_organ": 18,
    "church_organ": 19,
    "reed_organ": 20,
    "accordion": 21,
    "acoustic_guitar_nylon": 24,
    "acoustic_guitar_steel": 25,
    "electric_guitar_jazz": 26,
    "electric_guitar_clean": 27,
    "electric_guitar_muted": 28,
    "overdriven_guitar": 29,
    "distortion_guitar": 30,
    "acoustic_bass": 32,
    "electric_bass_finger": 33,
    "electric_bass_pick": 34,
    "fretless_bass": 35,
    "slap_bass_1": 36,
    "slap_bass_2": 37,
    "synth_bass_1": 38,
    "synth_bass_2": 39,
    "violin": 40,
    "viola": 41,
    "cello": 42,
    "contrabass": 43,
    "tremolo_strings": 44,
    "pizzicato_strings": 45,
    "orchestral_harp": 46,
    "string_ensemble_1": 48,
    "string_ensemble_2": 49,
    "synth_strings_1": 50,
    "synth_strings_2": 51,
    "choir_aahs": 52,
    "voice_oohs": 53,
    "trumpet": 56,
    "trombone": 57,
    "tuba": 58,
    "muted_trumpet": 59,
    "french_horn": 60,
    "brass_section": 61,
    "synth_brass_1": 62,
    "synth_brass_2": 63,
    "soprano_sax": 64,
    "alto_sax": 65,
    "tenor_sax": 66,
    "baritone_sax": 67,
    "oboe": 68,
    "english_horn": 69,
    "bassoon": 70,
    "clarinet": 71,
    "piccolo": 72,
    "flute": 73,
    "recorder": 74,
    "lead_1_square": 80,
    "lead_2_sawtooth": 81,
    "lead_5_charang": 84,
    "pad_1_new_age": 88,
    "pad_2_warm": 89,
    "pad_3_polysynth": 90,
    "pad_4_choir": 91,
    "pad_7_halo": 95,
}

NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]


def midi_to_note_name(midi_note: int) -> str:
    """Convert MIDI note number to note name with flat notation (e.g., 61 -> Db4)."""
    octave = (midi_note // 12) - 1
    name = NOTE_NAMES[midi_note % 12]
    return f"{name}{octave}"


def get_sample_notes() -> "list[int]":
    """Generate MIDI note numbers: every 3 semitones from C2 (36) to C7 (96)."""
    return list(range(36, 97, 3))


def create_midi_file(program: int, midi_note: int, output_path: str) -> None:
    """Create a MIDI file with a single note-on event."""
    midi = MIDIFile(1)
    midi.addTempo(0, 0, 120)
    midi.addProgramChange(0, 0, 0, program)
    # Note duration of 3 beats at 120 BPM = 1.5 seconds
    midi.addNote(0, 0, midi_note, 0, 3, 100)

    with open(output_path, "wb") as f:
        midi.writeFile(f)


def render_with_fluidsynth(
    sf2_path: str, midi_path: str, wav_path: str, duration: float = 2.0
) -> bool:
    """Render a MIDI file to WAV using fluidsynth."""
    try:
        subprocess.run(
            [
                "fluidsynth",
                "-ni",
                "-F",
                wav_path,
                "-r",
                "44100",
                "-g",
                "1.0",
                sf2_path,
                midi_path,
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  fluidsynth error: {e.stderr.decode()}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print("Error: fluidsynth not found. Install with: brew install fluidsynth", file=sys.stderr)
        sys.exit(1)


def convert_to_ogg(wav_path: str, ogg_path: str) -> bool:
    """Convert WAV to OGG using ffmpeg."""
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                wav_path,
                "-c:a",
                "libopus",
                "-b:a",
                "96k",
                "-af",
                "afade=t=out:st=1.5:d=0.5",
                ogg_path,
            ],
            check=True,
            capture_output=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ffmpeg error: {e.stderr.decode()}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print("Error: ffmpeg not found. Install with: brew install ffmpeg", file=sys.stderr)
        sys.exit(1)


def extract_instrument(
    sf2_path: str, instrument_name: str, program: int, output_dir: Path
) -> Optional[dict]:
    """Extract all sample notes for a single instrument."""
    inst_dir = output_dir / instrument_name
    inst_dir.mkdir(parents=True, exist_ok=True)

    notes = get_sample_notes()
    extracted = []

    with tempfile.TemporaryDirectory() as tmpdir:
        for midi_note in notes:
            note_name = midi_to_note_name(midi_note)
            midi_path = os.path.join(tmpdir, f"{note_name}.mid")
            wav_path = os.path.join(tmpdir, f"{note_name}.wav")
            ogg_path = str(inst_dir / f"{note_name}.ogg")

            create_midi_file(program, midi_note, midi_path)

            if not render_with_fluidsynth(sf2_path, midi_path, wav_path):
                continue

            if not convert_to_ogg(wav_path, ogg_path):
                continue

            extracted.append(note_name)

    if not extracted:
        return None

    # Write manifest
    manifest = {"instrument": instrument_name, "notes": extracted}
    with open(inst_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest


def main():
    parser = argparse.ArgumentParser(description="Extract instrument samples from SF2 soundfont")
    parser.add_argument("sf2_path", help="Path to the SF2 soundfont file")
    parser.add_argument(
        "--output",
        default="public/samples",
        help="Output directory (default: public/samples)",
    )
    parser.add_argument(
        "--instruments",
        nargs="*",
        help="Specific instruments to extract (default: all)",
    )
    args = parser.parse_args()

    sf2_path = os.path.abspath(args.sf2_path)
    if not os.path.exists(sf2_path):
        print(f"Error: SF2 file not found: {sf2_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Filter instruments if specified
    instruments = GM_INSTRUMENTS
    if args.instruments:
        instruments = {k: v for k, v in GM_INSTRUMENTS.items() if k in args.instruments}
        missing = set(args.instruments) - set(instruments.keys())
        if missing:
            print(f"Warning: unknown instruments: {', '.join(missing)}", file=sys.stderr)

    total = len(instruments)
    print(f"Extracting {total} instruments from {sf2_path}")
    print(f"Output: {output_dir}")
    print()

    for i, (name, program) in enumerate(instruments.items(), 1):
        print(f"[{i}/{total}] {name} (program {program})...")
        result = extract_instrument(sf2_path, name, program, output_dir)
        if result:
            print(f"  -> {len(result['notes'])} notes extracted")
        else:
            print(f"  -> FAILED (no notes extracted)")

    print()
    print("Done!")


if __name__ == "__main__":
    main()
