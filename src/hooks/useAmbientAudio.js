import { useState } from 'react'

// Ambient soundscape layer for the story, built on the Web Audio API.
//
// Graph:
//   bedSource(beat) ─► bedGain (crossfade) ─► ambientBus ─► duckGain ─► destination
//
// - bedGain: per-bed gain, ramped 0→1 / 1→0 for the 1.5s crossfade between beats.
// - ambientBus: static base level so ambience sits under the narration.
// - duckGain: ducking — ramps down while the narrator speaks, back up when silent.
//
// Narration timing stays the master (scheduled in App.jsx). This controller just
// reacts: `crossfadeTo(index)` on each beat, `duck()/unduck()` driven by narration
// play/end events.
//
// Beds are NOT looped — each baked file contains a one-shot transient (lightning
// crack, petal pop, etc.) that must not retrigger, and the beds are longer than
// their beat windows anyway.

const AMBIENT_BASE = 0.7 // resting ambient level relative to narration (1.0)
const DUCK_LEVEL = 0.65 // ducked target on duckGain → ~35% drop while voice plays
const CROSSFADE_S = 1.5 // linear crossfade between beat beds
const DUCK_DOWN_S = 0.3 // ramp down when narration starts
const DUCK_UP_S = 0.6 // swell back up when narration ends
const FADE_OUT_S = 2.5 // gentle fade of the whole ambient layer at the story's end

// Build a self-contained ambient controller. All state lives in this closure, so
// the returned object is a stable instance (created once via useState below).
function createAmbientController() {
  let ctx = null
  let ambientBus = null
  let duckGain = null
  const buffers = new Map() // beat index -> decoded AudioBuffer
  const bedGains = new Map() // beat index -> per-bed gain target (default 1)
  let current = null // { source, gain } of the playing bed
  let pendingIndex = null // crossfade requested before its buffer decoded

  // Ramp a gain param from its current value to `target` over `seconds`.
  const ramp = (param, target, seconds) => {
    const now = ctx.currentTime
    param.cancelScheduledValues(now)
    param.setValueAtTime(param.value, now)
    param.linearRampToValueAtTime(target, now + seconds)
  }

  // Start a bed and crossfade it in, fading out whatever was playing.
  const playBed = (index) => {
    const buffer = buffers.get(index)
    if (!ctx || !ambientBus || !buffer) return
    const now = ctx.currentTime

    // Fade out + stop the previous bed.
    if (current) {
      ramp(current.gain.gain, 0, CROSSFADE_S)
      try {
        current.source.stop(now + CROSSFADE_S + 0.05)
      } catch {
        // already stopped
      }
    }

    // Fade in the new bed (to its per-beat target gain, default 1).
    const target = bedGains.get(index) ?? 1
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(target, now + CROSSFADE_S)
    gain.connect(ambientBus)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(gain)
    source.start(now)

    current = { source, gain }
  }

  return {
    // Create the AudioContext + gain graph and kick off decoding. Must be
    // called from a user gesture (the Begin click) so the context can start.
    start(story) {
      if (ctx) return
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      ctx = new Ctx()

      duckGain = ctx.createGain()
      duckGain.gain.value = 1
      duckGain.connect(ctx.destination)

      ambientBus = ctx.createGain()
      ambientBus.gain.value = AMBIENT_BASE
      ambientBus.connect(duckGain)

      ctx.resume?.()

      story.beats.forEach((beat, index) => {
        if (!beat.effect) return
        fetch(beat.effect)
          .then((res) => res.arrayBuffer())
          .then((data) => ctx.decodeAudioData(data))
          .then((buffer) => {
            buffers.set(index, buffer)
            if (pendingIndex === index) {
              pendingIndex = null
              playBed(index)
            }
          })
          .catch((err) => console.warn('[ambient] decode failed', beat.effect, err))
      })
    },

    // Crossfade to a beat's bed. If its buffer hasn't decoded yet, queue it.
    // `gain` scales this bed's level (default 1) for per-beat balancing.
    crossfadeTo(index, gain = 1) {
      if (!ctx) return
      bedGains.set(index, gain)
      if (buffers.has(index)) playBed(index)
      else pendingIndex = index
    },

    // Duck the ambient bus while the narrator speaks.
    duck() {
      if (ctx && duckGain) ramp(duckGain.gain, DUCK_LEVEL, DUCK_DOWN_S)
    },

    // Swell the ambient back up when narration stops.
    unduck() {
      if (ctx && duckGain) ramp(duckGain.gain, 1, DUCK_UP_S)
    },

    // Gently fade the whole ambient layer to silence at the story's end (vs the
    // last bed just running out / cutting). Stops the source once faded.
    fadeOut(seconds = FADE_OUT_S) {
      if (!ctx || !ambientBus) return
      const now = ctx.currentTime
      ramp(ambientBus.gain, 0, seconds)
      if (current) {
        try {
          current.source.stop(now + seconds + 0.05)
        } catch {
          // already stopped
        }
        current = null
      }
    },

    // Tear everything down (restart / unmount).
    stop() {
      if (current) {
        try {
          current.source.stop()
        } catch {
          // already stopped
        }
      }
      current = null
      pendingIndex = null
      buffers.clear()
      bedGains.clear()
      if (ctx) ctx.close?.()
      ctx = null
      ambientBus = null
      duckGain = null
    },
  }
}

export function useAmbientAudio() {
  // Lazy initializer runs once; the controller instance is stable for the
  // component's lifetime, so it's safe in App's effect/callback dependencies.
  const [controller] = useState(createAmbientController)
  return controller
}
