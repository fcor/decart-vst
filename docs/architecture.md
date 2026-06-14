# Architecture

## Stack

- **React 19 + Vite** — frontend
- **`@decartai/sdk`** — realtime style transfer (model: `lucy-restyle-2`)
- **Netlify Functions** — server-side endpoint that mints short-lived client tokens (so the Decart server key never ships to the browser)
- **ElevenLabs** — narration audio, hand-made and exported as static mp3 files served from `public/audio/<storyId>/` (no runtime API)

No backend beyond the single Netlify function.

## Data flow

```
[ User clicks Begin ]
        ↓
[ getUserMedia → local webcam stream ]
        ↓
[ POST /.netlify/functions/get-token ]
        ↓  (returns short-lived client apiKey)
[ createDecartClient({ apiKey }) ]
        ↓
[ client.realtime.connect(localStream, { model, onRemoteStream }) ]
        ↓
[ remoteStream → <video> element on screen ]
        ↓
[ App.jsx schedules setTimeout for each story beat ]
        ↓
[ At each beat → client.setPrompt(beat.prompt) + show beat.narration + play beat.audio ]
        ↓
[ At durationSec → phase = "done" ]
```

Narration is prebaked mp3 (`beat.audio`, served from `public/audio/<storyId>/<n>.mp3`),
played from a single `<audio>` element whose `src` is swapped per beat. The element is
"unlocked" during the Begin click (muted play→pause) so later `setTimeout`-driven
`play()` calls aren't blocked by the browser autoplay policy. Audio is optional —
missing files just no-op, leaving the caption.

An **ambient sound layer** (`useAmbientAudio`, Web Audio API) plays a per-beat sound
bed (`beat.effect`, `public/audio/<storyId>/effects/<n>.wav`) underneath. Beds crossfade
(1.5s) with the visual transition, and the bus **ducks** ~35% while the narrator speaks
(driven by the narration element's `play`/`ended` events), swelling back up between
lines. Narration timing stays the master; the ambient layer only reacts. Greenhouse is
the only story with effects today; others no-op gracefully.

(A reference-image path — `client.setImage(blob, { prompt })` — was prototyped and
parked; on `lucy-restyle-2` the image overrides the prompt. See `roadmap.md` Parked
and `decart-notes.md`.)

## File map

```
decart-style-st/
├── netlify/functions/get-token.js   ← mints client token (server-only DECART_API_KEY)
├── netlify.toml                      ← build + functions config
├── src/
│   ├── main.jsx                      ← React entry
│   ├── App.jsx                       ← phase machine: idle → running → done
│   ├── App.module.css
│   ├── index.css
│   ├── data/
│   │   └── story.js                  ← narrative library — `stories[]`, each with beats/prompts/narration/durationSec
│   ├── hooks/
│   │   ├── useDecartStory.js         ← connect / disconnect / setPrompt
│   │   └── useAmbientAudio.js        ← Web Audio ambient layer (crossfade + ducking)
│   └── components/
│       ├── StartScreen/              ← story picker + "Begin" button
│       ├── StoryStage/               ← webcam + restyled output (full-screen)
│       └── Caption/                  ← bottom-of-screen narration text
├── docs/                             ← you are here
├── public/
│   ├── audio/<storyId>/<n>.mp3        ← prebaked narration clips, one per beat
│   │   └── effects/<n>.wav            ← ambient sound beds, one per beat (greenhouse only)
│   └── references/                   ← parked style-reference images (beatN.jpg/.webp)
└── .env                              ← DECART_API_KEY, ALLOWED_ORIGIN (gitignored)
```

## Phases (App.jsx state machine)

| Phase | What's on screen | What's happening |
| --- | --- | --- |
| `idle` | `StartScreen` | Story picker; waiting for user to choose + click Begin |
| `running` | `StoryStage` + `Caption` | Camera streaming, beats firing on a timeline |
| `done` | "The end" + Restart | Cleanup, offer replay |

Beats are scheduled via `setTimeout` from `t` values (seconds) in `story.js`. The first beat fires immediately when `onReady` resolves; the rest are queued. All timeouts cleared on unmount or restart.

## Token security

- `DECART_API_KEY` (server key) lives in `.env` locally and Netlify env vars in prod. **Never** ships to the browser.
- The Netlify function exchanges it for a client token scoped to:
  - `allowedModels: ['lucy-restyle-2']`
  - `allowedOrigins: [ALLOWED_ORIGIN]` — must match the deployed origin
  - `expiresIn: 300s`, `maxSessionDuration: 300s`

If the deployed origin and `ALLOWED_ORIGIN` env var don't match, the SDK will refuse to connect.

## Things that are intentionally simple

- No state management library — `useState` + a ref for the SDK client is enough.
- `<audio>` element plays per-beat mp3 narration; caption is the visual fallback when a clip is missing.
- Story is a static JS file, not a CMS or JSON fetched at runtime. Editing the story = editing the file = redeploying.
