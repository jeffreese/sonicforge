# Genre Starter Templates

Opt-in starter kits per genre. Load this file when the request has a clear genre hint **and** you want a ready-to-customize base. Otherwise, compose from scratch using `genre-guide.md` for conventions — templates are never required.

**These are starting points, not prescriptions.** Swap instruments, change presets, rewrite patterns, scale structure bars, pick a different key — whatever the request actually needs. The value is not having to rediscover the core sound-design choices for a genre every single time.

## How to use a template

1. Pick the template closest to the requested genre.
2. Copy its `instruments`, `masterEffects`, and `sidechain` snippets as your composition shell.
3. Adapt structure bars to the requested length.
4. Pick one of the listed chord progressions (or write your own).
5. Write every note yourself — templates never prescribe melodies or basslines.

Each template lists: vibe, BPM/key defaults, structure skeleton, instrument starter JSON, master + sidechain patterns, 2-3 chord progressions, and prose notes on the genre's characteristic rhythm and texture.

---

## House (tech / deep / classic)

**Vibe:** Four-on-the-floor dance. Clean, groovy, club-ready.
**BPM:** 122–128 (default 124). **Keys:** minor preferred (Am, Em, Cm) or modal major.
**Structure skeleton:** Intro 16 → Buildup 8 → Drop 16 → Breakdown 16 → Buildup 8 → Drop 16 → Outro 16

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 85,
    "oneshots": {
      "kick": "samples/oneshots/kicks/171104__dwsd__kick_gettinglaid.wav",
      "clap": "samples/oneshots/claps/509526__synthnisse__claps.wav",
      "hat": "samples/oneshots/hats/399897__theflakesmaster__hi-hat.ogg",
      "hat-open": "samples/oneshots/hats/816813__tboneaudio__hellcat-hi-hats.wav"
    }
  },
  { "id": "bass", "category": "bass", "source": "synth", "synth": "reese_bass", "defaultVolume": 85 },
  { "id": "stab", "category": "pad", "source": "synth", "synth": "stab_pad", "defaultVolume": 70 },
  {
    "id": "pad", "category": "pad", "source": "synth", "synth": "warm_pad", "defaultVolume": 60,
    "effects": [{ "type": "reverb", "params": { "decay": 5, "wet": 0.6 } }]
  },
  {
    "id": "lead", "category": "melodic", "source": "synth", "synth": "detuned_lead", "defaultVolume": 72,
    "effects": [{ "type": "delay", "params": { "delayTime": "8n", "feedback": 0.25, "wet": 0.3 } }]
  }
]
```

### Master + sidechain
```json
"masterEffects": [
  { "type": "eq3", "id": "tone", "params": { "low": 1, "mid": 0, "high": 1 } },
  { "type": "limiter", "id": "glue", "params": { "threshold": -1 } }
],
"sidechain": [
  { "source": "drums", "target": "pad", "amount": 0.85, "release": 0.12 },
  { "source": "drums", "target": "stab", "amount": 0.75, "release": 0.1 }
]
```

### Chord progressions (minor)
- **Moody:** i – bVII – bVI – bVII  (Am: Am – G – F – G)
- **Uplifting:** i – bIII – bVII – iv  (Am: Am – C – G – Dm)
- **Classic house:** i – iv – bVII – bIII  (Cm: Cm – Fm – Bb – Eb)

### Rhythm notes
- Kick on 1, 2, 3, 4 — velocity emphasis on 1 and 3 (e.g. 115/92/108/92)
- Clap on 2 and 4
- Closed hat on offbeats (1&, 2&, 3&, 4&), open hat on 2a or 4a for the off-offbeat feel
- Bass locks rhythmically with the kick, often hitting offbeats (1&, 2&, 3&, 4&)
- Stab pad hits on beat 1 of each bar; the sidechain pumping on pad/stab is the signature groove

---

## Bass House (big room / dark)

**Vibe:** Warehouse-after-hours. Dark minor-key 4-on-floor with a filthy reese bassline as the primary hook. Think Jauz, Malaa, AC Slater.
**BPM:** 126 (125–128). **Keys:** always minor — F minor, G minor, A minor.
**Structure skeleton:** Intro 16 → Build 8 → Drop 16 → Break 16 → Build 8 → Drop 2 16–32 → Outro 16

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 88,
    "oneshots": {
      "kick": "samples/oneshots/kicks/265328__xkpl_klawz__big-room-kick-punchy.wav",
      "clap": "samples/oneshots/claps/147597__kendallbear__never-be-clap.wav",
      "hat": "samples/oneshots/hats/399897__theflakesmaster__hi-hat.ogg",
      "hat-open": "samples/oneshots/hats/816813__tboneaudio__hellcat-hi-hats.wav",
      "snare": "samples/oneshots/snares/673516__theendofacycle__flat-fat-snare-drum-hit.wav"
    }
  },
  {
    "id": "reese", "category": "bass", "source": "synth", "synth": "reese_bass", "defaultVolume": 88,
    "effects": [
      { "type": "eq3", "params": { "low": -6, "mid": 3, "high": 0, "lowFrequency": 90 } },
      { "type": "distortion", "params": { "distortion": 0.35, "wet": 0.4 } }
    ]
  },
  {
    "id": "sub", "category": "bass", "source": "synth", "synth": "sub_bass", "defaultVolume": 90,
    "effects": [{ "type": "eq3", "params": { "low": 4, "mid": -8, "high": -30, "lowFrequency": 80, "highFrequency": 220 } }]
  },
  { "id": "stab", "category": "pad", "source": "synth", "synth": "stab_pad", "defaultVolume": 68 },
  {
    "id": "pad", "category": "pad", "source": "synth", "synth": "warm_pad", "defaultVolume": 62,
    "effects": [{ "type": "reverb", "params": { "decay": 7, "wet": 0.65 } }]
  },
  {
    "id": "fx", "category": "fx", "source": "oneshot",
    "oneshots": {
      "riser-short": "samples/oneshots/fx/487697__rubenrox__vocal-chop-riser.ogg",
      "riser-long": "samples/oneshots/fx/503818__reathance__riser-3.ogg",
      "impact": "samples/oneshots/fx/177242__deleted_user_3277771__cinematic-impact.ogg",
      "impact-deep": "samples/oneshots/fx/754421__zazzsounddesign__dsgnimpt_deep-cinematic-impact-2_zazz.ogg"
    }
  }
]
```

### Sidechain
```json
"sidechain": [
  { "source": "drums", "target": "reese", "amount": 0.55, "release": 0.1 },
  { "source": "drums", "target": "sub", "amount": 0.35, "release": 0.08 },
  { "source": "drums", "target": "stab", "amount": 0.85, "release": 0.12 },
  { "source": "drums", "target": "pad", "amount": 0.8, "release": 0.15 }
]
```

### Chord progressions
- **Classic dark:** i – bVI – iv – bVII  (Fm: Fm – Db – Bbm – Eb)
- **Menacing:** i – bVII – bVI – v  (Fm: Fm – Eb – Db – Cm)
- **Descending:** i – bVI – bIII – bVII  (Fm: Fm – Db – Ab – Eb)

### Rhythm notes
- **The reese bassline IS the hook.** Build a 1-bar pattern that rotates per chord: root on beats 1 & 3 (strong, velocity 115–125), octave-up stabs on the offbeats (1&, 2&, 3&), fifth passing tones on beat 4&
- Drums: kick on 1/2/3/4, clap on 2 & 4, closed hat on 1&/3&, open hat on 2&/4&
- Sub bass plays root whole/half notes an octave below the reese
- Stab pad hits on beat 1 (optionally 3) for rhythmic chord stabs
- Build phase snare roll accelerates from 16ths → 32nds; drops are marked with a cinematic impact + vocal riser

### Automation hints
- Swell `reese.volume` from ~-18 dB at the start of each build to ~-2 dB at the end for an energy rise
- Tighten `master.limiter.threshold` from -3 dB in intro/break to -1 dB at drops for perceived loudness
- **Avoid** automating `<bass>.filter.frequency` on any instrument whose synth preset includes a `filterEnvelope` (reese_bass, wobble_bass, acid_bass). Tone.js MonoSynth filter envelopes claim the param's range and reject external ramps. Use volume, EQ, or autofilter-effect automation instead.

---

## Dubstep

**Vibe:** Half-time heavy. Wobble bass as the lead instrument, huge drops, minor-key menace.
**BPM:** 140 (feels like 70). **Keys:** minor — F minor, G minor, A minor.
**Structure skeleton:** Intro 8 → Buildup 8 → Drop 16 → Break 8 → Buildup 8 → Drop 2 16 → Outro 8

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 90,
    "oneshots": {
      "kick": "samples/oneshots/kicks/400707__mattc90__subby-kick-drum.wav",
      "snare": "samples/oneshots/snares/371860__cryanrautha__ganon-snare.ogg",
      "hat": "samples/oneshots/hats/652026__deadrobotmusic__serum-hat-9.wav"
    }
  },
  {
    "id": "bass", "category": "bass", "source": "synth", "defaultVolume": 90,
    "synth": {
      "type": "mono",
      "oscillator": { "type": "sawtooth" },
      "filter": { "type": "lowpass", "frequency": 400, "Q": 8 }
    },
    "effects": [{ "type": "distortion", "params": { "distortion": 0.5, "wet": 0.6 } }]
  },
  { "id": "sub", "category": "bass", "source": "synth", "synth": "sub_bass", "defaultVolume": 88 },
  { "id": "lead", "category": "melodic", "source": "synth", "synth": "supersaw_lead", "defaultVolume": 75 },
  {
    "id": "pad", "category": "pad", "source": "synth", "synth": "warm_pad", "defaultVolume": 55,
    "effects": [{ "type": "reverb", "params": { "decay": 8, "wet": 0.7 } }]
  }
]
```

### LFO wobble (the signature move)
```json
"lfos": [
  { "id": "wobble", "frequency": "8n", "type": "sine", "min": 120, "max": 2000 }
],
"modulation": [
  { "source": "wobble", "target": "bass.filter.frequency" }
]
```

The wobble synth is defined inline (not a preset) specifically so its filter envelope is absent — LFO modulation on `filter.frequency` only works on mono synths without a filterEnvelope claiming the param.

### Chord progressions
- **Dark minimal:** i – i – bVI – bVII  (sustain the i for 2 bars, then move)
- **Horror tension:** i – bII – bVI – bVII  (the bII is the "horror movie" chord)

### Rhythm notes
- **Half-time drums:** kick on beat 1, snare on beat 3 (not 2 & 4). 8th-note hat roll between hits.
- Bass plays sustained notes — the wobble LFO is what provides the rhythmic expression
- Drop 1 is usually the "melodic" drop, drop 2 is heavier/screechier
- Use `riser-long` before drops and a cinematic `impact` at the drop downbeat

---

## Drum & Bass

**Vibe:** Fast breakbeat + rolling sub. Energetic, dark, driving.
**BPM:** 174 (170–180). **Keys:** minor — C minor, F minor, G minor.
**Structure skeleton:** Intro 8 → Drop 16 → Switch-up 8 → Drop 2 16 → Outro 8

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 88,
    "oneshots": {
      "kick": "samples/oneshots/kicks/465547__mccaslinmusic__big-vintage-kick-drum.m4a",
      "snare": "samples/oneshots/snares/809832__cvltiv8r__brass-ludwig-snare.ogg",
      "hat": "samples/oneshots/hats/674296__theendofacycle__hi-hat-closed-hit-clean.wav"
    }
  },
  { "id": "sub", "category": "bass", "source": "synth", "synth": "sub_bass", "defaultVolume": 92 },
  { "id": "reese", "category": "bass", "source": "synth", "synth": "reese_bass", "defaultVolume": 85 },
  {
    "id": "pad", "category": "pad", "source": "synth", "synth": "warm_pad", "defaultVolume": 55,
    "effects": [{ "type": "reverb", "params": { "decay": 6, "wet": 0.65 } }]
  }
]
```

### Rhythm notes
- **Amen-break-style kick/snare:** kick on 1 and the "and-of-3" (2a) at minimum — breakbeat, not 4-on-floor
- Snare on 2 and 4 with ghost notes (velocity 30–40) in between
- Hats on 8ths or 16ths with heavy syncopation
- **Sub bass plays 8th notes locked to the kick** — the rolling D&B foundation
- Drops usually kick in with a single exposed snare hit after a brief drop-out
- Dark pad in the intro/break for atmosphere

---

## Future Bass

**Vibe:** Euphoric, melodic. Huge supersaw chord stabs + trap-style half-time drums.
**BPM:** 140–160 (default 150, feels half-time around 75). **Keys:** major or minor — bright progressions, lots of pitch bend.
**Structure skeleton:** Intro 8 → Build 8 → Drop 16 → Break 8 → Build 8 → Drop 2 16 → Outro 8

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 85,
    "oneshots": {
      "kick": "samples/oneshots/kicks/265328__xkpl_klawz__big-room-kick-punchy.wav",
      "snare": "samples/oneshots/snares/371860__cryanrautha__ganon-snare.ogg",
      "hat": "samples/oneshots/hats/652026__deadrobotmusic__serum-hat-9.wav",
      "clap": "samples/oneshots/claps/147597__kendallbear__never-be-clap.wav"
    }
  },
  {
    "id": "lead", "category": "melodic", "source": "synth", "synth": "supersaw_lead", "defaultVolume": 82,
    "effects": [
      { "type": "chorus", "params": { "frequency": 2, "depth": 0.7, "wet": 0.5 } },
      { "type": "reverb", "params": { "decay": 4, "wet": 0.35 } }
    ]
  },
  { "id": "pluck", "category": "melodic", "source": "synth", "synth": "pluck_lead", "defaultVolume": 75 },
  { "id": "bass", "category": "bass", "source": "synth", "synth": "sub_bass", "defaultVolume": 85 },
  {
    "id": "pad", "category": "pad", "source": "synth", "synth": "warm_pad", "defaultVolume": 60,
    "effects": [{ "type": "reverb", "params": { "decay": 6, "wet": 0.6 } }]
  }
]
```

### Chord progressions (voice stacked 4-note chords for the lead)
- **Bright:** I – V – vi – IV  (C: C – G – Am – F)
- **Melancholy:** vi – IV – I – V  (Am – F – C – G)
- **Dramatic minor:** i – bVI – bIII – bVII  (Am – F – C – G)

### Rhythm notes
- **Trap-style drums:** kick on 1 and "and-of-2" (2&), snare on 3, 16th/32nd hat rolls with velocity variation
- **Chord stabs on every 8th of the drop** — big walls of stacked supersaw chords drive the whole track
- Sub bass holds long low root notes under the stabs
- Pluck lead plays the melodic hook over the chord stabs
- Characteristic texture: chorus + reverb + stereo width on the lead; pitch bends via note `portamento` or separate notes approaching/leaving

---

## Trance

**Vibe:** Euphoric, uplifting, driving. Supersaw lead, rolling arpeggios, 4-on-floor.
**BPM:** 136 (132–140). **Keys:** minor with lots of bVII — A minor, E minor, F minor.
**Structure skeleton:** Intro 16 → Break 16 → Build 16 → Drop 16 → Outro 8

### Instruments starter
```json
[
  {
    "id": "drums", "category": "drums", "source": "oneshot", "defaultVolume": 85,
    "oneshots": {
      "kick": "samples/oneshots/kicks/171104__dwsd__kick_gettinglaid.wav",
      "clap": "samples/oneshots/claps/147597__kendallbear__never-be-clap.wav",
      "hat-open": "samples/oneshots/hats/816813__tboneaudio__hellcat-hi-hats.wav"
    }
  },
  {
    "id": "lead", "category": "melodic", "source": "synth", "synth": "supersaw_lead", "defaultVolume": 82,
    "effects": [
      { "type": "delay", "params": { "delayTime": "8n", "feedback": 0.4, "wet": 0.35 } },
      { "type": "reverb", "params": { "decay": 4, "wet": 0.4 } }
    ]
  },
  { "id": "arp", "category": "melodic", "source": "synth", "synth": "arp_pluck", "defaultVolume": 68 },
  { "id": "bass", "category": "bass", "source": "synth", "synth": "reese_bass", "defaultVolume": 85 },
  { "id": "pad", "category": "pad", "source": "synth", "synth": "organ_pad", "defaultVolume": 65 }
]
```

### Sidechain
```json
"sidechain": [
  { "source": "drums", "target": "pad", "amount": 0.85, "release": 0.12 },
  { "source": "drums", "target": "arp", "amount": 0.5, "release": 0.1 }
]
```

### Chord progressions (trance-emotional)
- **Classic trance:** i – bVII – bVI – bVII  (Am: Am – G – F – G)
- **Epic:** i – bVI – III – bVII  (Am: Am – F – C – G)
- **Descending:** i – v – bVI – iv  (Am: Am – Em – F – Dm)

### Rhythm notes
- Kick on 1, 2, 3, 4 with **open hat on 1e, 2e, 3e, 4e** (off-offbeats — the trance signature)
- Bass plays **offbeats** (1&, 2&, 3&, 4&) — the "driving bass" pattern, distinct from house's on-beat bass
- Arp plays 16th notes rolling through chord tones across 2–3 octaves
- Lead holds long soaring melody notes over the chord progression
- Break section: drop drums, let pad + lead sustain the emotional chord progression

---

## Quick genre picker

| Request keywords | Template |
|---|---|
| house, deep house, tech house | House |
| bass house, big room, dark house, Jauz, Malaa, AC Slater | Bass House |
| dubstep, wobble, dub | Dubstep |
| drum and bass, d&b, dnb, jungle, liquid | Drum & Bass |
| future bass, Flume, Illenium, chord stabs | Future Bass |
| trance, uplifting, supersaw lead, epic | Trance |

For genres **not** listed here (lofi, trap, ambient, techno, classical, jazz, rock, etc.), compose from scratch using `genre-guide.md` and the other reference files. Templates are an optional shortcut, not a required step.
