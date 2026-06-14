# Decisions

Append-only log. Newest at top. Each entry: date, decision, why, what was rejected.

---

## 2026-06-11 — Rear camera by default on mobile, with a pre-start front/rear toggle

**Decision:** On coarse-pointer devices (phones/tablets) the camera defaults to `facingMode: 'environment'` (rear); desktop stays `'user'` (front). A front/rear segmented toggle on the StartScreen lets the user choose before Begin. Display mirroring (`scaleX(-1)`) is now conditional — applied only to the front camera.

**Why:** On a phone in selfie mode the face fills the frame and the environmental restyle (forest/cavern/sunset) is lost. The rear camera lets the user scan their surroundings and watch the world transform — more on-theme ("transform the world around you") and more striking on mobile. Mirroring must be front-only or rear-camera text/scenes come out backwards.

**Rejected:** In-session camera flip — the Decart session is bound to the stream at `connect()`, so switching mid-story means disconnect → reconnect → model re-warm → story restart. Not worth it; the pre-start toggle covers the need. Kept display-side CSS mirroring (conditional) rather than switching to the SDK's input `mirror` option, to preserve current front-camera behavior.

**Note:** Input sent to Decart is un-flipped in both modes (unchanged); only the displayed video is mirrored for front. `getUserMedia` uses `facingMode: { ideal }` so devices without the requested camera fall back instead of throwing.

---

## 2026-06-11 — First prompt via `initialState` fixes cold-start transition lag

**Decision:** Send beat 0's prompt as `connect({ initialState: { prompt: { text } } })` so the model renders the opening look during connection setup, and skip re-sending beat 0's prompt in the scheduler.

**Why:** With `leadInSec: 0` (visual cut lands on the line), the earliest transitions felt laggy. Root cause was model cold-start: right after `connect`, the first `setPrompt` round-trips and the model spins up generation over a second or two. Warming the model at connect (initialState) smoothed not just beat 0 but the **whole set** of transitions, because the pipeline never goes cold mid-story. Documented Decart best practice.

**Open lever:** If the first couple of runtime `setPrompt` changes ever drag, add a small per-beat `lead` override (decaying to 0) — not needed currently.

**Rejected:** Raising `leadInSec` globally (would push the visual cut off the narration line, which 0 nailed).

---

## 2026-06-11 — Ambient sound layer via Web Audio API (crossfade + ducking)

**Decision:** A new `useAmbientAudio` controller plays a per-beat ambient sound bed (`beat.effect`, baked .wav, greenhouse only) on the Web Audio API. Graph: `bedSource → bedGain (crossfade) → ambientBus → duckGain → destination`. Beds crossfade 1.5s on the visual-transition timeline; `duckGain` ramps to ~0.65 (a ~35% drop) while the narrator speaks and back to 1.0 when silent, driven by the narration `<audio>` element's `play`/`ended` events. Beds are not looped (baked-in transients must not retrigger; beds are longer than their windows anyway).

**Why:** Ducking and crossfading need smooth, sample-accurate gain ramps — exactly what Web Audio `GainNode.linearRampToValueAtTime` gives. HTML5 `<audio>.volume` + `setInterval` would stutter. Event-driven ducking (vs a true sidechain compressor / AudioWorklet) is simple and precise since we control narration playback.

**Implementation notes:**
- Controller is built once via `useState(createAmbientController)` so its identity is stable across renders (App depends on it in effect deps). Avoided the lazy-`useRef` init pattern, which trips the React Compiler "no refs during render" rule.
- `AudioContext` is created inside the Begin gesture; beds decode async and a pending-index queue covers the case where beat 0 fires before its buffer is ready.

**Knobs:** `AMBIENT_BASE` 0.7, `DUCK_LEVEL` 0.65, `CROSSFADE_S` 1.5, `DUCK_DOWN_S` 0.3, `DUCK_UP_S` 0.6, `FADE_OUT_S` 2.5. Per-beat `effectGain` balances an individual bed (e.g. greenhouse beat 2 at 1.4). At the story's end, `fadeOut()` ramps the whole ambient bus to silence rather than letting the last bed run out.

**Rejected:** True sidechain compression (needs an AudioWorklet to analyze the voice — overkill); looping beds (retriggers baked transients); HTML5 volume automation (not smooth).

---

## 2026-06-11 — Focus on greenhouse; peak + origami parked via `enabled` flag (not deleted)

**Decision:** Greenhouse is the lead story. Peak and origami stay in the `stories[]` array with `enabled: false`, so they're kept in code (and their audio in `public/audio/`) but hidden from the UI. `activeStories` filters to the enabled ones. With a single active story, the StartScreen skips the picker and shows a clean single-story intro (title + pitch + Begin).

**Why:** On live testing greenhouse was clearly the strongest; peak's visuals/transitions were weak. But the others are cheap to keep and may be revived, so deleting them would be premature.

**Re-enabling:** Flip `enabled: true` — the picker reappears automatically when 2+ stories are active.

**Rejected:** Deleting peak/origami outright (loses work + audio); leaving all three in the picker (shows a weak story to users).

---

## 2026-06-11 — Per-beat narration audio wired; beat timing tuned to clip lengths

**Decision:** Each beat has an optional `audio` path (`public/audio/<storyId>/<n>.mp3`), played from a single reusable `<audio>` element whose `src` is swapped per beat at the beat's perceived time `t`. The element is unlocked during the Begin click (muted play→pause) to satisfy the browser autoplay policy, since the real `play()` calls fire later from `setTimeout`. Missing files no-op, leaving the caption.

Greenhouse clips measured at 7.5 / 7.1 / 7.8 / 9.8 / 5.3s, so beats were respaced from 0/8/16/24/30 (30s) to **0/9/18/27/38 (45s)** to give each clip ~1–2s of breathing room. peak/origami mirror this and are provisional until their clips are measured.

**Why:** The original 30s spacing cut off the longer clips (beat 4 ≈ 10s in a 6s slot). User confirmed 40–45s total is fine.

**Open:** Audio↔transition sync — the visual leads the perceived beat by `leadInSec` (2s); narration plays at `t`. Fine-tuning this offset is folded into the pacing/transition pass.

**Rejected:** Single full-story track with cue points — per-beat clips are simpler to sync, swap, and reason about for 5 short lines.

---

## 2026-06-11 — Three stories + StartScreen picker (was: one story)

**Decision:** `src/data/story.js` exports a `stories[]` library (currently three: Overgrown Greenhouse, Echoes of the Peak, Clockwork Origami Dream). The StartScreen shows a picker; the chosen story drives the scheduler. `story` remains exported as an alias for `stories[0]`.

**Why:** We had three good candidate arcs and no reason to pick just one — letting the user choose adds replay value for the cost of a small picker UI. Resolves the "multiple stories?" open question.

**Detail:** Each story's final beat lands at `t: 30`, so `durationSec` is set to `35` (not 30) to give the closing narration ~5s of screen time before the phase flips to `done`. Earlier single-story default was 30s with the last beat at 24.

**Rejected:** A CMS / runtime-fetched story JSON — still overkill; the library is a static JS array, edited and redeployed like before.

---

## 2026-06-11 — Reference image + prompt via bundled `setImage(blob, { prompt })` (one atomic message)

**Decision:** For a beat with a `referenceImage`, fire a single `setImage(blob, { prompt })` call. Beats without a `referenceImage` call `setPrompt()` only and inherit the previous beat's sticky image ("visual chapters").

**Why:** Verified in the SDK source (`webrtc-connection.js → setImageBase64`): the second arg is real, not ignored. The prompt rides on a single `set_image` WebSocket message (`message.prompt`) alongside `image_data`, so image + prompt apply as **one** atomic server-side update = one model reload. A later `setPrompt()` sends only a `prompt` message and leaves the image in place, so the reference stays sticky.

**Rejected:**
- Separate `setImage(blob)` then `setPrompt(prompt)` — two messages, two reloads. Empirically double-flickered (the prompt visibly rewrote the just-applied image). Was briefly the documented-example approach; the on-the-wire trace overrode it.
- `set({ prompt, image })` — clears omitted fields, so a later prompt-only beat would wipe the sticky image; also flagged in Decart docs as unreliable for Restyle Live style refs.
- Switching to `lucy-2.1` — character/identity transfer expecting **face** references; ours are environment/style art, and restyle handles image+prompt atomically anyway. (Still being confirmed with the Decart team — see open question.)

**Note:** References are fetched into Blobs and cached at connect time so beat-time swaps have no fetch latency.

---

## 2026-06-11 — Narration is prebaked mp3 files, not runtime TTS

**Decision:** Narration audio is hand-made in ElevenLabs ahead of time, exported as static mp3 files dropped into `public/audio/`, and played from the beat scheduler. No TTS API call, no Netlify function for audio.

**Why:** One author, one story at a time. The voice lines are fixed once the story is settled, so there's no reason to generate them at runtime. Static files are simpler, free to serve, and have zero latency.

**Rejected:** Server-side TTS via a second Netlify function or build-time pre-render — more moving parts than a fixed prototype needs.

---

## 2026-06-11 — Smooth beat transitions: lead-in + CSS blur mask (no model-side smoothing exists)

**Decision:** Two-timeline scheduling. `setPrompt` fires `leadInSec` (default 2s) before each beat's `t`; caption / narration index advances at `t`. A CSS class on the output `<video>` applies blur(14px) + brightness(0.65) + saturate(0.8) for 1.2s around each `setPrompt` to hide the model's visible interpolation tear.

**Why:** The Decart docs confirm there is no built-in interpolation, blend, or strength parameter between successive `setPrompt` calls. The visual jump is unavoidable on the model side, so we hide it programmatically. Lead-in + mask was the cheapest, least-invasive option.

**Rejected:**
- "Bridge prompt" technique (sending a transitional in-between prompt) — risk of muddy outputs, more API churn. Park for later.
- Audio-time-driven scheduling — defer until ElevenLabs audio lands.

**Knobs:** `story.leadInSec` (per-story), `TRANSITION_MS` constant in `App.jsx` (1200ms), CSS values in `StoryStage.module.css`.

---

## 2026-06-11 — Use `lucy-restyle-2`, not `lucy-vton-latest`

**Decision:** The token function only allows `lucy-restyle-2`. The story uses `client.setPrompt(string)` exclusively — no garment images.

**Why:** The storytelling experience is about transforming the *world around* the user, not adding objects to them. Restyle is the right primitive.

**Rejected:** Allowing both models like `decart-1.0` does. Keeps the token surface area minimal.

---

## 2026-06-11 — Story is a static JS file, not a CMS

**Decision:** `src/data/story.js` is the source of truth. Editing the story means editing the file and redeploying.

**Why:** One author (us). One story at a time. A CMS would be bigger than the prototype.

**Rejected:** Fetching story JSON at runtime, building a story editor UI.

---

## 2026-06-11 — `setTimeout`-driven beats, not audio-time-driven

**Decision:** Beats fire on `setTimeout(t * 1000)` from `story.js`.

**Why:** No audio yet. Once ElevenLabs is wired, this should switch to audio `timeupdate` events so beats stay in sync if audio drifts.

**Note:** Re-evaluate when audio lands. Tracked in roadmap.

---

## 2026-06-11 — Local git identity scoped to project

**Decision:** `git config user.email = fcor14@hotmail.com` and `user.name = Fabio Cortes` set in the local repo (not global).

**Why:** Global git is set to `fjcr@amazon.it`. We don't want Amazon identity in this public-facing prototype's history. Same setup as `ColorPalette` — `decart-1.0` had this leak.

**Rejected:** Changing global git config (would affect other Amazon work).

---

## 2026-06-11 — `.env` checked in? No.

**Decision:** `.env` is gitignored. `.env.example` shows the shape.

**Why:** `DECART_API_KEY` is sensitive. Netlify env vars handle prod.

---
