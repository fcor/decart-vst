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
| `lucy-restyle-2` | Realtime **style** transfer — what we use. Text prompt and/or a non-face style reference image. |
| `lucy-2.1` | Realtime character/identity transfer — expects a **face** reference. Not for environment/style refs. |
| `lucy-2.5` | *(coming soon)* Decart recommends it for non-face style/atmosphere — expected to be a better fit for this app than `restyle-2`. |
| `lucy-vton-latest` | Virtual try-on — accepts a garment image. Used by sibling `decart-1.0` project. |

`models.realtime(id)` returns a `{ width, height, fps }` shape we use to ask `getUserMedia` for the right video constraints.

## Prompt switching

- `client.setPrompt(string)` — text-only restyle. Defaults to `enhance: true` (keep it on — it enriches the prompt). This is what the app uses.
- `client.set({ prompt, image, enhance })` — **atomic** combined update (text + style reference together). Use this to change both at once, not separate `setImage`/`setPrompt` (which double-reload). Not sticky — re-send the image each call (see Reference images).
- `client.setImage(image)` — style reference only (its second arg is ignored; see Reference images).
- **All of `set` / `setPrompt` / `setImage` return a promise that resolves only once the transform is applied server-side.** We drive the blur mask off this (see `App.jsx` `triggerBeatPrompt`) so it tracks the real transform duration; also usable to prevent duplicate in-flight calls or show a before/after indicator.
- Prompt swaps are **not instant** — the visual interpolates over a second or two. Plan beats accordingly (≥5s apart).

## Reference images (style references) — corrected by the Decart team (2026-06-11)

For `lucy-restyle-2` (Lucy Restyle Live) the reference image is a **style** anchor — not
a face/identity (that's Lucy 2.1). Authoritative guidance from the Decart team:

1. **Combine image + prompt with `set({ image, prompt, enhance })`** — one atomic update.
   `setImage(blob, { prompt })` is **not** a valid signature; the second argument is
   ignored. (That's exactly why our test showed the image applied but the prompt ignored.)
   Calling `setImage()` then `setPrompt()` separately is a **double-reload by design**.
2. **`set()` is not sticky.** It does not persist the image across later calls — you must
   re-send the image on every `set()`. The efficient pattern is to **upload the file once
   with `client.files.upload()` and reuse the returned `file_…` id** (sent as a reference
   on the wire instead of re-encoding the bytes each time).
3. **Keep `enhance: true`** — it enriches the text prompt to complement the style reference.
4. **No reference-vs-prompt weighting** is exposed today; the balance isn't client-configurable.

> ⚠️ Supersedes earlier notes in this file that claimed `setImage(blob, { prompt })` sends
> the prompt atomically and that the image is sticky — **both wrong**. The SDK serializes
> the prompt onto the `set_image` message, but the server ignores it.

For this use case the Decart team **recommends waiting for Lucy 2.5** (releasing soon),
which will handle non-face style/atmosphere transfer significantly better. Our reference-
image feature stays parked until then.

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
