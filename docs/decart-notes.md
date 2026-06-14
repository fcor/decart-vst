# Decart SDK notes

Living document — append things we learn the hard way.

## Setup

```js
import { createDecartClient, models } from '@decartai/sdk'
const client = createDecartClient({ apiKey })   // client token, NOT server key
const rtClient = await client.realtime.connect(localStream, {
  model: models.realtime('lucy-restyle-2'),
  initialState: { prompt: { text: 'opening look' } }, // first frame already styled
  onRemoteStream: (remoteStream) => { /* attach to <video> */ },
  onError, onDisconnect,
})
await rtClient.setPrompt('new prompt string')
rtClient.disconnect()
```

## Cold start — use `initialState` for the first look

The model is **cold** right after `connect`: the first `setPrompt` has to reach the
server and the model needs a second or two to spin up generation, so the earliest
beats lag more than steady-state ones. Pass the opening prompt as
`connect({ initialState: { prompt: { text } } })` so beat 0's look renders *during*
connection setup (docs: otherwise viewers "briefly see the raw camera feed"). We do
this and skip re-sending beat 0's prompt in the scheduler. Residual lag on the first
couple of *runtime* `setPrompt` changes (beats 1–2) is model warm-up; compensate with
a small per-beat lead if needed.

## Token model

- **Server key** (`DECART_API_KEY`, format `dct_*`) lives only on the server. Used by `serverClient.tokens.create({...})` in the Netlify function.
- **Client token** is short-lived (we use 300s), scoped to specific models and origins. The browser receives this and uses it to connect.
- Token is bound to `allowedOrigins`. If the deployed Netlify origin doesn't match the env var, connection fails silently-ish (look in onError).

## Models we care about

| Model | What it does |
| --- | --- |
| `lucy-restyle-2` | Realtime style transfer — what we use. Prompts only, no input image. |
| `lucy-vton-latest` | Virtual try-on — accepts a garment image. Used by sibling `decart-1.0` project. |

`models.realtime(id)` returns a `{ width, height, fps }` shape we use to ask `getUserMedia` for the right video constraints.

## Prompt switching

- `client.setPrompt(string)` — fast, single-arg, no image. This is what the storytelling app uses.
- `client.set({ prompt, image, enhance })` — accepts a reference image (try-on flow). Not used here.
- Prompt swaps are **not instant** — the visual interpolates over a second or two. Plan beats accordingly (≥5s apart).

## Reference images (style references) — the one that bit us

For our model (`lucy-restyle-2` = Lucy Restyle Live), the reference image is a
**style** anchor, not a character/identity. Three SDK facts that matter:

1. **Send image + prompt in one call: `setImage(blob, { prompt })`.** Verified in the
   SDK source (`webrtc-connection.js → setImageBase64`): the `{ prompt }` option is
   attached to a single `set_image` WebSocket message, so both apply as one atomic
   server-side update (one reload). The docs' "Using style references" example shows
   two separate calls (`setImage` then `setPrompt`) — but empirically that sends two
   messages and double-flickers, the prompt rewriting the just-applied image. The
   bundled single call is the right move; our on-the-wire trace beats the doc example.

2. **Don't use `set()`.** `set()` replaces the whole state — `set({ prompt })` wipes a
   previously set image. That breaks "visual chapters", where a prompt-only beat must
   *keep* the prior sticky image. A bare `setPrompt()` touches only the prompt, so the
   image persists. (Decart docs also flag `set()` as unreliable for Restyle Live style refs.)

3. **The `setImage` second arg is real, not ignored.** It exists in the SDK's TS types
   and the compiled source builds `message.prompt` / `message.enhance_prompt` onto the
   `set_image` payload. Public API docs only show `setImage(image)`, but the installed
   SDK fully supports the options form.

Accepted image inputs: `Blob`, `File`, or URL string. We fetch our `public/references/`
files into Blobs and cache them at connect time so beat-time swaps have no fetch latency.
For images reused across reconnects, `client.files.upload()` returns a `file_…` id you can
pass instead of re-encoding bytes — not needed for our short single-session story.

## Camera constraints

Always pull `width/height/fps` from `models.realtime(modelId)`, not hard-coded. Different models accept different resolutions and the SDK is picky.

```js
const model = models.realtime(modelId)
navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: model.width },
    height: { ideal: model.height },
    frameRate: { ideal: model.fps },
    facingMode: 'user',
  },
  audio: false,
})
```

`facingMode: 'user'` = front camera. We mirror with `transform: scaleX(-1)` in CSS so it looks like a mirror.

## Cleanup

Always tear down on unmount:

```js
rtClient.disconnect()
stream.getTracks().forEach(t => t.stop())
```

Without that, you'll leak the camera light on iOS / Safari and burn server-side session minutes.

## Session duration limits

The token caps `maxSessionDuration: 300` (5 min). Plenty for a 30s story. If we go longer-form later, this needs raising.

## Things that bit us / will bite us

- *(empty for now — fill as we hit them)*
