# Genre Guide

Reference for genre-specific conventions when composing.

## Common Chord Progressions

**Uplifting/Pop:** I–V–vi–IV | **Emotional/Ballad:** I–vi–IV–V, vi–IV–I–V
**Jazzy:** ii–V–I, I–vi–ii–V | **Dramatic:** i–VI–III–VII
**Blues:** 12-bar (I–I–IV–I–V–IV–I–V) | **Tension:** i–bVI–bVII–i

## Song Forms

- **Pop/Rock:** Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus → Outro
- **Ballad:** Intro → Verse → Verse → Chorus → Verse → Chorus → Outro
- **Jazz:** Head → Solo → Solo → Head
- **Electronic:** Intro → Buildup → Drop → Breakdown → Buildup → Drop → Outro

## Genre Specifics

### Pop
BPM: 100–130 | Key: major preferred | Simple, repetitive melodies | 4-chord loop is fine

### Jazz
BPM: 80–180 | Keys with flats | Extended chords (7ths, 9ths) | Walking bass (quarter notes through chord tones) | Piano comps with rhythmic variation

### Classical/Orchestral
BPM: 60–140 | Dynamic range pp to ff | String ensemble for harmony, woodwinds for color | 4-bar or 8-bar phrases with clear cadences

### Electronic/Lo-fi
BPM: 70–90 (lo-fi), 120–140 (house), 140–170 (DnB) | Repetition with subtle variation | Effects: reverb on keys, delay on leads, chorus on pads

### Blues
BPM: 60–120 | 12-bar form | Blue notes: b3, b5, b7 over major chords | Guitar or piano lead, walking bass

## EDM Subgenres

See `synth-presets.md`, `effects-reference.md`, `modulation-patterns.md`, and `oneshot-hits.md` for the specific presets, effects, and modulation patterns referenced below. Use `source: 'synth'` with the suggested preset + `source: 'oneshot'` drum kits for the canonical sound.

For a ready-to-customize starting kit (instruments + master chain + sidechain JSON), see the optional `genre-templates.md` — opt-in shortcut for house, bass house, dubstep, drum & bass, future bass, and trance.

### House
BPM: 120–128 | 4-on-the-floor kick | Open hat on off-beats (2&, 4&) | Sidechain kick → pad pumping (amount 0.7–0.9, release 0.1) | Instruments: `reese_bass` or `acid_bass`, `warm_pad` or `stab_pad`, `detuned_lead` for hooks | Song form: intro → buildup → drop → breakdown → drop → outro

### Techno
BPM: 125–135 | Driving 4-on-floor kick, minimal snare (maybe on 4 or a "ghost" clap) | 16th-note hat patterns | Industrial textures | Sparse melodic content, repetition-focused | Instruments: `acid_bass`, `reese_bass`, effect-heavy leads via `distortion` + `bitcrusher` | Minimal pads

### Trance
BPM: 132–140 | 4-on-floor kick with open hat | Driving bass on off-beats (unlike house's on-beats) | Instruments: `supersaw_lead` is mandatory, `arp_pluck` for rolling arpeggios, `organ_pad` | Long buildups with automated filter sweeps + volume swells | Emotional chord progressions (i–VI–III–VII, i–bVII–VI–bVII)

### Dubstep
BPM: 140 (feels like 70 half-time) | Half-time kick/snare (kick on 1, snare on 3) | Wobble bass via LFO → `bass.filter.frequency` (required: `type: 'mono'`, LFO at `"8n"` or `"16n"`) | Trap-style hi-hat rolls | FX-heavy (impacts on drops, risers into drops) | Minor keys | Instruments: `wobble_bass`, `fm_bass`, `supersaw_lead` for melodic sections

### Drum & Bass
BPM: 170–180 | Fast breakbeat kick/snare pattern (amen break or similar) | Rolling sub bass (`sub_bass` or `reese_bass`) playing 8th notes locked to kick | Atmospheric pads in breakdowns | Song form: intro → drop → switch-up → drop → outro | Dark minor keys (C minor, F minor) | D&B snares should hit on 2 and 4 with ghost notes in between

### Trap
BPM: 140 (half-time feel 70) | 808 sub (`sub_bass`) with pitch slides via automation | Tight trap snare (`371860__cryanrautha__ganon-snare.ogg` or trap-style) | 16th and 32nd hi-hat rolls with velocity variation (55 → 110 → 55) | Sparse melodic elements (`fm_bell`, `pluck_lead`) | Minor keys, lots of space | Effects: reverb on snares, minimal elsewhere

### Future Bass
BPM: 140–160 | Half-time feel | `supersaw_lead` for huge chord stabs (stacked fifths + octaves) | `pluck_lead` for melodic hooks | Emotional pitch-bent pad chords | Drops: chord stabs over trap-style drums | Automation: reverb wet swells, filter sweeps on the lead | Effect-heavy (chorus, reverb, stereowidener)

### Ambient
BPM: 60–80 (or unpitched, no transport) | No drums or sparse single hits | `warm_pad` drone as the foundation | `fm_bell` for sparse melodic colors | Long reverb decays (6s+) on everything | Extensive modulation (phaser, chorus, autofilter for slow movement) | Minimalist progression (one chord for 16 bars is fine) | Evolution via automation of filter/reverb over long time scales

## Drum Patterns

**Pop/Rock:** Kick: 1, 3 | Snare: 2, 4 | Hihat: steady 8ths
**Ballad:** Sparse kick on 1 | Light snare on 3 | Soft ride
**Funk:** Syncopated kick | Snare: 2, 4 | 16th hihat with ghost notes
**Jazz:** Ride cymbal swing 8ths | Kick accents | Snare comping
**Electronic:** Four-on-floor kick | Snare/clap: 2, 4 | Open hihat on off-beats

## Key Character

**Major:** C neutral | G bright | D triumphant | F pastoral | Bb mellow | Eb heroic | A joyful | E brilliant
**Minor:** A melancholy | E introspective | D serious | B lonely | G tragic | C dramatic

## Tag Vocabulary

`metadata.tags` is a flat array of lowercase-hyphenated tokens. The **first tag is the primary genre** by convention; the rest are modifiers, moods, energy markers, and structural hints in no particular order. Most compositions warrant 3–5 tags total.

The vocabulary below is a seed list — not exhaustive, not prescriptive. Invent new tags when none fit, but prefer existing ones for consistency so the index can aggregate cleanly.

### Primary genre (pick one, goes first)

**EDM family:** `house`, `deep-house`, `tech-house`, `bass-house`, `big-room-house`, `progressive-house`, `techno`, `minimal-techno`, `industrial-techno`, `trance`, `psytrance`, `hardstyle`, `dubstep`, `brostep`, `drum-and-bass`, `liquid-dnb`, `neurofunk`, `jungle`, `breakbeat`, `future-bass`, `trap`, `phonk`, `hardcore`, `uk-garage`, `2-step`

**Other electronic:** `ambient`, `downtempo`, `idm`, `glitch`, `chiptune`, `synthwave`, `vaporwave`, `lo-fi`, `chillhop`, `lounge`

**Non-electronic:** `pop`, `rock`, `indie-rock`, `metal`, `punk`, `folk`, `country`, `jazz`, `blues`, `funk`, `soul`, `rnb`, `hip-hop`, `classical`, `orchestral`, `cinematic`, `film-score`, `game-music`

**Fusion or uncertain:** combine with a hyphen, e.g. `dark-dubstep`, `liquid-dnb`, `deep-bass-house`, or use a descriptive compound like `melancholic-lament`.

### Mood

`dark`, `melancholic`, `moody`, `wistful`, `nostalgic`, `hopeful`, `uplifting`, `triumphant`, `euphoric`, `dreamy`, `introspective`, `aggressive`, `menacing`, `ominous`, `horror`, `creepy`, `playful`, `whimsical`, `quirky`, `romantic`, `sensual`, `serene`, `meditative`, `chaotic`, `frantic`, `driving`, `relentless`, `tense`, `suspenseful`, `hypnotic`, `psychedelic`, `grim`, `triumphant`

### Energy

`low-energy`, `medium-energy`, `high-energy`, `building`, `slow-burn`, `frantic`, `languid`, `sparse`, `dense`, `minimalist`, `maximalist`

### Structure / form

`two-drops`, `one-drop`, `no-drop`, `long-breakdown`, `short-intro`, `radio-edit`, `extended-mix`, `loop`, `through-composed`, `verse-chorus`, `aaba`, `drone`, `call-and-response`

### Sound design / production

`sidechained`, `wobble-bass`, `reese-bass`, `sub-heavy`, `808-heavy`, `supersaw`, `arpeggiated`, `pad-driven`, `lead-driven`, `bass-driven`, `acoustic`, `sampled`, `synthesized`, `hybrid`, `reverb-wash`, `dry`, `distorted`, `bitcrushed`, `filter-swept`, `auto-filtered`, `humanized`, `mechanical`

### Era / reference

`80s`, `90s`, `2000s`, `modern`, `retro`, `vintage`, `jauz-style`, `skrillex-style`, `flume-style`, `burial-style`, `aphex-style` (only when the reference is clear and intentional)

### Examples

- `["dubstep", "dark", "horror", "two-drops", "cinematic"]`
- `["deep-house", "atmospheric", "minor-key", "sidechained", "medium-energy"]`
- `["trance", "uplifting", "long-breakdown", "supersaw", "building"]`
- `["ambient", "drone", "melancholic", "minimalist", "slow-burn"]`
- `["trap", "808-heavy", "menacing", "half-time", "sparse"]`
- `["melancholic-lament", "piano", "dry", "acoustic", "aaba"]`
