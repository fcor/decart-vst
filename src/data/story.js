// Placeholder narrative arc — we'll iterate on this together.
// Each beat: when (seconds from start) → swap the restyle prompt.
// Audio narration text is here for reference; ElevenLabs wiring comes later.

export const story = {
  title: 'Untitled Story',
  durationSec: 30,
  modelId: 'lucy-restyle-2',
  beats: [
    {
      t: 0,
      prompt: 'Soft dawn light, warm pastel palette, hand-painted storybook illustration style, gentle film grain',
      narration: 'It begins with you, in the quiet light of a story not yet told.',
    },
    {
      t: 8,
      prompt: 'Stepping into a misty enchanted forest, lush green ferns, beams of golden light through tall trees, Studio Ghibli watercolor style',
      narration: 'You step into a forest where every leaf remembers a secret.',
    },
    {
      t: 16,
      prompt: 'Standing at the edge of a glowing crystal cavern, deep teal and violet light, magical particles in the air, cinematic fantasy painting',
      narration: 'The path opens onto a cavern alive with light.',
    },
    {
      t: 24,
      prompt: 'Sunrise over an open ocean horizon, warm gold and rose sky, soft clouds, peaceful epic finale, oil painting',
      narration: 'And when you look up, the sky has been waiting for you all along.',
    },
  ],
}
