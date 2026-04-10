# One-Shot Hit Reference

Bundled CC0 samples available via `source: 'oneshot'` instruments. Every file lives under `public/samples/oneshots/` and is addressable via a URL like `"samples/oneshots/kicks/171104__dwsd__kick_gettinglaid.wav"`.

The composition author defines the hit-name vocabulary in the instrument's `oneshots` map — keys are arbitrary (`"kick"`, `"trap-kick"`, `"riser1"`, etc.) and the composition's note tracks trigger samples by those names.

## Instrument shape

```json
{
  "id": "drums",
  "category": "drums",
  "source": "oneshot",
  "oneshots": {
    "kick": "samples/oneshots/kicks/171104__dwsd__kick_gettinglaid.wav",
    "snare": "samples/oneshots/snares/673516__theendofacycle__flat-fat-snare-drum-hit.wav",
    "hat": "samples/oneshots/hats/399897__theflakesmaster__hi-hat.ogg",
    "clap": "samples/oneshots/claps/509526__synthnisse__claps.wav"
  }
}
```

And in note tracks:

```json
{ "pitch": "kick", "time": "0:0:0", "duration": "4n", "velocity": 100 }
```

Velocity (0-127) scales the player's output level before triggering. Unknown hit names are silent no-ops — no crashes on typos.

## Available samples by category

### Kicks (6) — all `samples/oneshots/kicks/`

| File | Character | Fits |
|---|---|---|
| `171104__dwsd__kick_gettinglaid.wav` | Deep house / minimal tech — 30K+ downloads on Freesound | House, tech house, deep house |
| `400707__mattc90__subby-kick-drum.wav` | Sub 808 (~50 Hz fundamental) | Trap, hip-hop, dubstep sub |
| `265328__xkpl_klawz__big-room-kick-punchy.wav` | Punchy big room | Big room house, EDM mainroom |
| `647617__johnnypanic__lo-fi-kick-drum-01.wav` | Lo-fi, FL Studio | Lo-fi hip-hop, chillhop |
| `465547__mccaslinmusic__big-vintage-kick-drum.m4a` | Vintage acoustic Ludwig | Breakbeat, acoustic drum & bass |
| `333677__meshgarden__03-kick1.wav` | Generic electronic | Techno, electro |

### Snares (5) — all `samples/oneshots/snares/`

| File | Character | Fits |
|---|---|---|
| `673516__theendofacycle__flat-fat-snare-drum-hit.wav` | Thick layered | House, EDM, drum & bass |
| `693179__digitalunderglow__drumhit_snare9.wav` | All-purpose one-shot | Anything |
| `460898__anarkya__snare-01-minimoog.wav` | MiniMoog synth snare | Trance, electro, techno |
| `809832__cvltiv8r__brass-ludwig-snare.ogg` | Cropped brass Ludwig | Drum & bass, breakbeat |
| `371860__cryanrautha__ganon-snare.ogg` | Tight treble-boosted | Trap, drum & bass |

### Hi-hats (6) — all `samples/oneshots/hats/`

| File | Character | Fits |
|---|---|---|
| `399897__theflakesmaster__hi-hat.ogg` | Electronic closed (most popular) | House, techno, EDM |
| `674296__theendofacycle__hi-hat-closed-hit-clean.wav` | Clean acoustic closed | Acoustic, jazz-leaning EDM |
| `811628__m0nsterhd__closed-hi-hat.wav` | Modern homemade closed | Trap, hip-hop |
| `652026__deadrobotmusic__serum-hat-9.wav` | Serum wavetable synth closed | Trap, future bass |
| `25677__walter_odington__alex-hat.aiff` | Classic 2006 electro | Electro, old-school house |
| `816813__tboneaudio__hellcat-hi-hats.wav` | Open hat — 14" Zildjian K | House, techno, breakbeat |

### Claps (6) — all `samples/oneshots/claps/`

| File | Character | Fits |
|---|---|---|
| `147597__kendallbear__never-be-clap.wav` | Thick layered (13.6K DL — most popular clap on Freesound) | House, EDM, trance |
| `509526__synthnisse__claps.wav` | 3-person layered natural | House, disco |
| `493717__bastianpusch__handclap14.wav` | 50-member gospel choir | Soul, gospel, house |
| `701340__8bitmyketison__bark-clap.wav` | Trap-inspired 808-style | Trap, hip-hop |
| `199266__stumber__diamond_clap_05.wav` | 808-style recorded+edited | Trap, drum & bass |
| `695724__digitalunderglow__drumhit_clap9.wav` | All-purpose | Anything |

### FX — Risers (4) — all `samples/oneshots/fx/`

| File | Duration | Fits |
|---|---|---|
| `685256__syntheffects__riser-sound-effect-short.ogg` | 3s short | Quick fills, pre-drops |
| `487697__rubenrox__vocal-chop-riser.ogg` | 8s two-octave vocal chop | EDM drops |
| `503818__reathance__riser-3.ogg` | 19s long reverse/buildup | Long buildups, trance |
| `715353__audiopapkin__riser-hit-sfx-062.ogg` | Cinematic with impact tail | Drops with built-in impact |

### FX — Impacts (5) — all `samples/oneshots/fx/`

| File | Character |
|---|---|
| `177242__deleted_user_3277771__cinematic-impact.ogg` | Canonical cinematic impact (40K+ DL) |
| `719831__vekon__impact_01.ogg` | Midrange impact, EDM-tagged |
| `408141__jofae__cinematic-low-pitch-impact.ogg` | Gentle slam with fadeout |
| `804682__johnjohnfm__plasma-impact-two.ogg` | Cinematic plasma blast |
| `754421__zazzsounddesign__dsgnimpt_deep-cinematic-impact-2_zazz.ogg` | Deep cinematic |

### FX — Sweeps (5) — all `samples/oneshots/fx/`

| File | Direction / character |
|---|---|
| `257838__lostphosphene__white-noise-sweep-up.ogg` | White noise filter sweep up (11s) |
| `261415__stereo-surgeon__percusive-noise-riser.ogg` | Gated noise with delay slap |
| `167156__c0mp0s3r__dance-white-sweep-16bars-120bpm.ogg` | 16-bar sweep @ 120 bpm |
| `272464__hard3eat__simple-noise-sweep-140bpm.ogg` | Simple sweep @ 140 bpm |
| `786132__securesubset__filter-sweep-down.ogg` | Short downward (0.37s) |

## Common drum kit patterns

### House kit (4-on-floor, two hats)
```json
"oneshots": {
  "kick": "samples/oneshots/kicks/171104__dwsd__kick_gettinglaid.wav",
  "snare": "samples/oneshots/snares/673516__theendofacycle__flat-fat-snare-drum-hit.wav",
  "hat": "samples/oneshots/hats/399897__theflakesmaster__hi-hat.ogg",
  "hat-open": "samples/oneshots/hats/816813__tboneaudio__hellcat-hi-hats.wav",
  "clap": "samples/oneshots/claps/509526__synthnisse__claps.wav"
}
```

### Trap kit (808 sub, tight snare)
```json
"oneshots": {
  "kick": "samples/oneshots/kicks/400707__mattc90__subby-kick-drum.wav",
  "snare": "samples/oneshots/snares/371860__cryanrautha__ganon-snare.ogg",
  "hat": "samples/oneshots/hats/652026__deadrobotmusic__serum-hat-9.wav",
  "clap": "samples/oneshots/claps/701340__8bitmyketison__bark-clap.wav"
}
```

### D&B kit (breakbeat snare, thick kick)
```json
"oneshots": {
  "kick": "samples/oneshots/kicks/465547__mccaslinmusic__big-vintage-kick-drum.m4a",
  "snare": "samples/oneshots/snares/809832__cvltiv8r__brass-ludwig-snare.ogg",
  "hat": "samples/oneshots/hats/674296__theendofacycle__hi-hat-closed-hit-clean.wav"
}
```

## License

All samples are CC0 from Freesound.org. Full attribution in `public/samples/oneshots/LICENSE.md`.
