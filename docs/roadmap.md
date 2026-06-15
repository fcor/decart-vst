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
- Promise-driven transition mask: blur tracks the actual `setPrompt` resolve (transform applied server-side), with min/max bounds + a generation guard — adapts to connection/model speed instead of a fixed timer
- UI polish pass: serif display type + CSS-variable palette, refined Start/End screens, breathing background, animated "Preparing the story…" loader; fluid type + safe-area insets + `100dvh` for responsiveness

## Parked / blocked

- **Reference image plumbing** — built, tested twice, reverted both times; prompt-only stays the default. Latest attempt used the correct `set({ image, prompt, enhance })` recipe on beats 1–4, but the **image dominated the prompt** and there's no weighting knob to rebalance (and the refs were repurposed/mismatched). Mechanism is sound; it's a creative/weighting limitation of `restyle-2`. The hook plumbing (`setImagePrompt`/`preloadImages`/scheduler branch) is left dormant. **Revisit with greenhouse-matched refs and/or Lucy 2.5** (Decart says it handles this use case much better). Code + recipe ready; test images in `public/references/`.

## Next (in rough order)

1. **Person-presence gate (cost saver)** — only connect to Decart when there's a person in front of the camera. Adapt the [DecartAI tryon-examples / person-detection](https://github.com/DecartAI/tryon-examples/tree/main/examples/person-detection) example. Specifics:
   - Use `@mediapipe/tasks-vision` (Pose Landmarker, `pose_landmarker_lite` model, GPU delegate, VIDEO running mode, `numPoses: 1`)
   - Build a `usePersonDetection(videoEl)` hook returning `{ personPresent, isReady }`
   - Poll at `DETECTION_INTERVAL_MS` (1000 ms); flip `personPresent=false` only after `MISS_THRESHOLD` (3) consecutive empty detections (~3s) so a passing occlusion doesn't tear down the session
   - Use this as a *gate* before `connect()` runs and to trigger `disconnect()` when the person leaves; on return, fresh token → reconnect → resume the story (or restart it — design call)
   - Add a "Step into the frame to begin" affordance on `StartScreen` while waiting for first detection
2. **Responsive verification on real devices** — the layout is now fluid (clamp type, safe-area insets, `100dvh`, ≥48px touch targets). Still to verify on actual hardware: iOS Safari (portrait) `<video>` autoplay + getUserMedia + the home-indicator inset, iPad, small Android. Test on devices, not just Chrome devtools.

## Later (open questions)

- **Atmosphere baked into prompts** — split `prompt` into `scene` + `style` + `atmosphere` and compose at runtime, to make motion/mood language easy to tweak per beat. Deprioritized: greenhouse prompts are settled and working, so this is only worth it if we iterate prompts a lot more.
- Save/share the result — record the output stream to a video file the user can download
- Mobile portrait layout — currently full-bleed; verify on iOS Safari
- Branching narrative — let the user choose a path mid-story?
- Voice variants — different ElevenLabs voices per story?
- Pre-roll countdown — "Story starts in 3… 2… 1…" so user can pose
- **Lucy 2.5 upgrade** — when it releases, evaluate it for the restyle (Decart says it's a better fit for non-face style/atmosphere) and re-test the reference-image idea on it.

## Open questions to resolve with the user

- *(empty — add as they come up)*
