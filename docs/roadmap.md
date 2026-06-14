# Roadmap

## Done

- React + Vite skeleton copied from `decart-1.0` and adapted
- Netlify token function scoped to `lucy-restyle-2` only
- App phase machine: `idle → running → done`
- `StartScreen`, `StoryStage`, `Caption` components
- `useDecartStory` hook (connect / disconnect / setPrompt)
- Placeholder 30s, 4-beat story in `src/data/story.js`
- Local git identity set to personal (no Amazon leak)
- First deploy on Netlify ✓
- Smooth beat transitions: lead-in (`story.leadInSec`) + CSS blur/dim mask
- Multiple stories + StartScreen picker: `stories[]` library, user picks one before Begin
- Prebaked per-beat narration audio: `beat.audio` mp3s in `public/audio/<storyId>/`, single `<audio>` element, autoplay unlocked on the Begin gesture
- Beat timing tuned to clip lengths (greenhouse measured): beats at 0/9/18/27/38, ~45s total
- Ambient sound layer (Web Audio): per-beat beds, 1.5s crossfade, ducking under narration, end fade-out; per-beat `effectGain`; ambient has its own lead (`AMBIENT_LEAD_SEC`)
- Transition cold-start fix: first prompt via `connect` `initialState` — smoothed the whole set of transitions at `leadInSec: 0`

## Parked / blocked

- **Reference image plumbing** — built and reverted. The sticky `referenceImage` wiring (fetch→Blob→cache, `setImage(blob, { prompt })`) worked, but on `lucy-restyle-2` the reference image and text prompt appear mutually exclusive: with an image set, the prompt is ignored, and the image-only output was less interesting than prompt-only. Reverted to prompt-only. Blocked on Decart's answer (see `decart-notes.md`) re: whether any realtime model truly *combines* image + prompt. Code preserved in git history; test images still in `public/references/`.

## Next (in rough order)

1. **Polish StartScreen + EndScreen** — visuals, copy, share affordance
2. **Person-presence gate (cost saver)** — only connect to Decart when there's a person in front of the camera. Adapt the [DecartAI tryon-examples / person-detection](https://github.com/DecartAI/tryon-examples/tree/main/examples/person-detection) example. Specifics:
   - Use `@mediapipe/tasks-vision` (Pose Landmarker, `pose_landmarker_lite` model, GPU delegate, VIDEO running mode, `numPoses: 1`)
   - Build a `usePersonDetection(videoEl)` hook returning `{ personPresent, isReady }`
   - Poll at `DETECTION_INTERVAL_MS` (1000 ms); flip `personPresent=false` only after `MISS_THRESHOLD` (3) consecutive empty detections (~3s) so a passing occlusion doesn't tear down the session
   - Use this as a *gate* before `connect()` runs and to trigger `disconnect()` when the person leaves; on return, fresh token → reconnect → resume the story (or restart it — design call)
   - Add a "Step into the frame to begin" affordance on `StartScreen` while waiting for first detection
3. **Full responsive layout — mobile + tablet** — the experience is full-bleed on desktop today; verify and polish on iOS Safari (portrait), iPad, and small Android. Specifically:
   - `<StoryStage>` and `<Caption>` should fill safe-area insets correctly
   - `StartScreen` typography/spacing scales down without clipping
   - Camera constraints request the right aspect ratio per breakpoint (the model's expected resolution may not match the device)
   - Touch targets ≥44px (Begin button, Restart button)
   - Test on real devices, not just Chrome devtools — iOS Safari has quirks with `<video>` autoplay + getUserMedia + 100vh

## Later (open questions)

- **Atmosphere baked into prompts** — split `prompt` into `scene` + `style` + `atmosphere` and compose at runtime, to make motion/mood language easy to tweak per beat. Deprioritized: greenhouse prompts are settled and working, so this is only worth it if we iterate prompts a lot more.
- Save/share the result — record the output stream to a video file the user can download
- Mobile portrait layout — currently full-bleed; verify on iOS Safari
- Branching narrative — let the user choose a path mid-story?
- Voice variants — different ElevenLabs voices per story?
- Pre-roll countdown — "Story starts in 3… 2… 1…" so user can pose

## Open questions to resolve with the user

- *(empty — add as they come up)*
