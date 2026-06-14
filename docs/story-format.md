# Story format

The narrative library lives in [`src/data/story.js`](../src/data/story.js). It exports
a `stories` array — the user picks one on the StartScreen, and the selected story drives
the beat scheduler. (`story` is also exported as a convenience alias for `stories[0]`.)

## Schema

```js
export const stories = [
  {
    id: string,           // stable key for the picker (e.g. 'greenhouse')
    title: string,        // shown on the StartScreen card
    pitch: string,        // one-line description shown under the title in the picker
    enabled: boolean,     // include in the UI? Flip to false to park a story without
                          // deleting it. `activeStories` = the enabled ones (or all,
                          // if none are enabled). One enabled story → picker is skipped.
    durationSec: number,  // total runtime; phase flips to "done" at this mark.
                          // Set it a few seconds PAST the final beat's t so the
                          // closing narration has time to land (we use 35 for t=30 endings).
    modelId: string,      // Decart realtime model — currently 'lucy-restyle-2'
    leadInSec?: number,   // setPrompt fires this many seconds BEFORE each beat's t
                          // so the model has time to interpolate (default tuning ~2s)
    beats: Beat[],
  },
  // ...more stories
]

type Beat = {
  t: number,              // when the user PERCEIVES this beat (caption + audio)
  prompt: string,         // sent to the model — the visual restyle
  narration: string,      // shown as caption
  audio?: string,         // prebaked mp3 narration, served from
                          // public/audio/<storyId>/<n>.mp3. Optional — if the file
                          // is missing, the beat still shows its caption (play() no-ops).
  effect?: string,        // ambient sound bed (one baked .wav per beat), served from
                          // public/audio/<storyId>/effects/<n>.wav. Optional — only
                          // greenhouse has effects today. Played via the Web Audio
                          // ambient layer with crossfade + ducking (see useAmbientAudio).
  effectGain?: number,    // per-bed level multiplier (default 1) to balance a quiet/loud
                          // bed against the others, e.g. 1.4 to boost. >1 amplifies.
}
```

> **Note:** A `referenceImage` field was prototyped (sticky style references per beat)
> but is currently **parked** — on `lucy-restyle-2` the image overrides the prompt
> rather than combining with it. See `decart-notes.md` and `roadmap.md` (Parked).
> Stories are prompt-only for now.

### Two timelines, not one

Each beat has two scheduled events:

```
beat.t = 8          ← caption / narration appears at t=8s
                      (this is what the user perceives)

setPrompt fires at  ← model starts interpolating to the new look
  (beat.t - leadInSec)   so it has settled by the time beat.t arrives
  = 6s

During setPrompt → setPrompt + 1.2s, a CSS blur/dim mask
hides the model's interpolation.
```

For `beat.t = 0` the prompt fires immediately (clamped to 0). The first beat's mask still runs, which doubles as the "Preparing the story…" reveal.

## Rules

- `beats[0].t` should be `0`. The first beat fires the moment the SDK is connected.
- `beats` must be sorted by ascending `t`.
- `t` values must be `< durationSec`. Anything past `durationSec` is dropped when the phase flips to `done`.
- Beat count is open, but **don't go too tight**. The SDK takes a beat or two of frames to visually settle on a new prompt — keep beats ≥ 5–6 seconds apart unless you're deliberately glitching.

## Prompt-writing notes

These notes evolve as we learn what `lucy-restyle-2` responds to.

- **Lead with a clear scene anchor**: "misty forest", "neon city at night", "Renaissance oil painting". Don't bury the noun.
- **Stack 2–4 modifiers**: lighting, palette, medium, mood. More than that and the model gets noisy.
- **Reuse the subject**: the user's face/body is the constant. Prompts should describe the *world around them*, not "a person". The model handles the subject continuity for free.
- **Style references work**: "Studio Ghibli watercolor", "Wes Anderson pastel", "1920s sepia film" — concrete references > abstract adjectives.
- **Avoid contradictions**: "bright dark cavern" → muddy results. Pick one.

## Narration-writing notes

For now, narration is just visual captions. Once the prebaked mp3 audio is wired:

- Each `narration` string should be one short sentence — ~10–20 words. Long sentences will spill past the next beat.
- Read each one aloud. If it sounds awkward, rewrite. The voice is the spine.
- Match cadence to visual changes. The narrator's pause should land on the prompt swap.
- The mp3 you generate in ElevenLabs must match the final `narration` text — if you edit the line, regenerate the audio.

## Editing workflow

1. Tweak `src/data/story.js`.
2. `npm run dev` (or just push — Netlify rebuilds in seconds).
3. Click Begin, watch it land, iterate.
4. Once it feels right, commit. The story file is the *deliverable*, not boilerplate around it.
