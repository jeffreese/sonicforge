# Sample Extraction

Extracts high-quality instrument samples from an SF2 soundfont file for use by SonicForge.

## Prerequisites

```bash
brew install fluidsynth ffmpeg
pip install -r scripts/requirements.txt
```

## Download a Soundfont

Download [MuseScore_General.sf2](https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/MuseScore_General.sf2) (~150MB) or use any GM-compatible SF2 file.

## Usage

```bash
# Extract all instruments
python scripts/extract-samples.py path/to/MuseScore_General.sf2

# Extract specific instruments
python scripts/extract-samples.py path/to/MuseScore_General.sf2 --instruments acoustic_grand_piano violin flute

# Custom output directory
python scripts/extract-samples.py path/to/MuseScore_General.sf2 --output public/samples
```

## Output

Samples are written to `public/samples/{instrument_name}/{note}.ogg` with a `manifest.json` per instrument listing available notes. Each instrument gets ~20 notes sampled every 3 semitones from C2 to C7.

The `public/samples/` directory is gitignored — each developer runs the extraction locally.
