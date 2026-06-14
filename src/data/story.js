// The narrative library. Each story is one arc the user can pick from the start
// screen. The selected story drives the beat scheduler in App.jsx.
//
// Beat schema:
//   t          — seconds from start when the user PERCEIVES this beat (caption/audio)
//   prompt     — the visual restyle sent to client.setPrompt()
//   narration  — one short sentence shown as caption
//   audio      — prebaked mp3 narration, served from public/audio/<storyId>/<n>.mp3.
//                Optional: if the file is missing, the beat still shows its caption.
//
// `leadInSec` fires setPrompt this many seconds BEFORE each beat's `t` so the model
// has time to interpolate before the user perceives the change.
//
// Timing: beat `t` values are spaced to fit each narration clip plus ~1–2s of
// breathing room (no overlapping voices). Measured clip lengths:
//   greenhouse 7.5/7.1/7.8/9.8/5.3s  → beats 0/9/18/27/38, ~45s
//   peak       7.3/6.8/8.3/7.5/10.5s → beats 0/9/18/28/38, ~49s (long finale clip)
//   origami    7.4/7.7/8.4/9.7/9.0s  → beats 0/9/19/29/40, ~50s (long clips throughout)
// durationSec sits just past the final beat's clip end so the closing line lands.

export const stories = [
  {
    id: 'greenhouse',
    title: 'The Overgrown Greenhouse',
    pitch: 'A quiet, rainy room transforms into a sun-drenched sanctuary of blooming, magical flora.',
    enabled: true,
    durationSec: 45,
    modelId: 'lucy-restyle-2',
    leadInSec: 0,
    beats: [
      {
        t: 0,
        audio: '/audio/greenhouse/1.mp3',
        effect: '/audio/greenhouse/effects/1.wav',
        prompt: 'Rainy conservatory background, soft overcast lighting, muted sage greens, Studio Ghibli watercolor style',
        narration: 'It started as a quiet, rainy afternoon, with nothing but the sound of the storm outside.',
      },
      {
        t: 9,
        audio: '/audio/greenhouse/2.mp3',
        effect: '/audio/greenhouse/effects/2.wav',
        effectGain: 1.4, // this bed is quiet — boost it to sit with the others
        prompt: 'Sprouting moss and ivy, emerald green palette, dappled warm sunlight breaking through, vibrant gouache illustration',
        narration: 'But then, the walls began to breathe, reaching out with fresh, living green.',
      },
      {
        t: 18,
        audio: '/audio/greenhouse/3.mp3',
        effect: '/audio/greenhouse/effects/3.wav',
        prompt: 'Giant blooming neon orchids, warm golden-hour lighting, pastel pink and lavender palette, whimsical storybook style',
        narration: "Flowers bloomed in seconds, catching the sudden, warm light of a sun you hadn't seen all day.",
      },
      {
        t: 27,
        audio: '/audio/greenhouse/4.mp3',
        effect: '/audio/greenhouse/effects/4.wav',
        prompt: 'Floating bioluminescent pollen, soft twilight glow, deep indigo and gold palette, magical realism painting',
        narration: 'The air filled with drifting, glowing stardust, turning your space into a living sanctuary.',
      },
      {
        t: 38,
        audio: '/audio/greenhouse/5.mp3',
        effect: '/audio/greenhouse/effects/5.wav',
        prompt: 'Sun-lit clear sky conservatory, bright midday sun, crisp crystal-clear palette, joyful impressionist oil style',
        narration: 'The storm has passed, and you are exactly where you are meant to grow.',
      },
    ],
  },
  {
    id: 'peak',
    title: 'Echoes of the Peak',
    pitch: 'Rise from a fractured, stormy mountain summit into a cosmic dawn of infinite starlight.',
    enabled: false, // dormant — kept for later, hidden from the picker
    durationSec: 49,
    modelId: 'lucy-restyle-2',
    leadInSec: 2,
    beats: [
      {
        t: 0,
        audio: '/audio/peak/1.mp3',
        prompt: 'Craggy mountain summit, moody charcoal gray palette, stark dramatic lightning, textured impasto oil painting',
        narration: 'You stand at the edge of the world, where the tempest rages against the stone.',
      },
      {
        t: 9,
        audio: '/audio/peak/2.mp3',
        prompt: 'Parting storm clouds, fiery crimson and amber lighting, epic cinematic scale, classic Romanticism landscape style',
        narration: 'Hold your ground, because the sky is about to tear wide open.',
      },
      {
        t: 18,
        audio: '/audio/peak/3.mp3',
        prompt: 'Floating obsidian ruins, cosmic starlight illumination, deep violet and magenta palette, sci-fi concept art style',
        narration: 'The earth falls away, lifting you into a graveyard of ancient, floating worlds.',
      },
      {
        t: 28,
        audio: '/audio/peak/4.mp3',
        prompt: 'Blinding supernova shockwave, radiant golden light, brilliant white and gold palette, high-contrast expressionist brushstrokes',
        narration: 'A star ignites in the distance, washing the universe in a wave of pure, triumphant light.',
      },
      {
        t: 38,
        audio: '/audio/peak/5.mp3',
        prompt: 'Serene infinite cosmos, calm cosmic stardust, deep space navy and silver palette, ethereal digital matte painting',
        narration: 'The chaos is gone, leaving you standing as the center of a brand new galaxy.',
      },
    ],
  },
  {
    id: 'origami',
    title: 'The Clockwork Origami Dream',
    pitch: 'A familiar space dissolves into a shifting labyrinth of melting timepieces and paper flight.',
    enabled: false, // dormant — kept for later, hidden from the picker
    durationSec: 50,
    modelId: 'lucy-restyle-2',
    leadInSec: 2,
    beats: [
      {
        t: 0,
        audio: '/audio/origami/1.mp3',
        prompt: 'Melting grandfather clock study, deep midnight blue palette, soft amber candle lighting, Salvador Dalí surrealist style',
        narration: 'Time is beginning to bend, softening the rigid corners of the reality you know.',
      },
      {
        t: 9,
        audio: '/audio/origami/2.mp3',
        prompt: 'Swirling origami bird cyclone, parchment white and sepia palette, dreamlike ethereal lighting, minimalist papercraft style',
        narration: 'The walls fracture into thousands of paper birds, taking flight into the open air.',
      },
      {
        t: 19,
        audio: '/audio/origami/3.mp3',
        prompt: 'Floating golden gears and cogs, iridescent neon lighting, metallic brass and teal palette, steampunk cyberpunk fusion style',
        narration: 'Look around as the invisible machinery of the universe exposes its beautiful, ticking heart.',
      },
      {
        t: 29,
        audio: '/audio/origami/4.mp3',
        prompt: 'Upside-down ocean sky, shimmering underwater sunbeams, turquoise and violet palette, fluid abstract acrylic ink style',
        narration: 'Gravity lets go completely, turning the sky above into a deep, weightless sea.',
      },
      {
        t: 40,
        audio: '/audio/origami/5.mp3',
        prompt: 'Calm starry dreamscape, soft monochromatic silver palette, gentle moonlit glow, minimalist line-art illustration',
        narration: 'Wake up within the dream; the world is waiting for you to rewrite it.',
      },
    ],
  },
]

// Default selection (first story) — kept as a named export for any code that
// just wants "a story" without going through the picker.
export const story = stories[0]

// Stories shown in the UI. Flip a story's `enabled` flag to add/remove it from
// the picker without deleting it. Falls back to all stories if none are enabled.
export const activeStories = stories.filter((s) => s.enabled).length
  ? stories.filter((s) => s.enabled)
  : stories
