# decart-style-st

A 30-second storytelling prototype that uses Decart's realtime style-transfer model to repaint a webcam feed as a story unfolds. Audio narration (ElevenLabs) is the next step.

## Stack

- React + Vite
- `@decartai/sdk` — `lucy-restyle-2` (realtime style transfer)
- Netlify Functions — server-side `get-token` to mint short-lived client tokens

## Local dev

```bash
npm install
npm run dev          # Vite dev server (no token endpoint)
# or
netlify dev          # serves /.netlify/functions/get-token too
```

Required env vars (in `.env` or Netlify UI):

- `DECART_API_KEY` — your Decart server key
- `ALLOWED_ORIGIN` — origin allowed by the minted client token (default `http://localhost:8888`)

## Story

Edit `src/data/story.js` to change beats, prompts, narration, and total duration.
