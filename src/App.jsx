import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import StartScreen from './components/StartScreen/StartScreen'
import StoryStage from './components/StoryStage/StoryStage'
import Caption from './components/Caption/Caption'
import { useDecartStory } from './hooks/useDecartStory'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { activeStories } from './data/story'

const TRANSITION_MS = 1200 // duration of the blur/dim mask around a setPrompt call
const AMBIENT_LEAD_SEC = 1 // ambient bed crossfades slightly ahead of the beat,
// independent of the visual leadInSec (which can be 0 to land the cut on the line)

function App() {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [selectedStory, setSelectedStory] = useState(activeStories[0])
  const [beatIndex, setBeatIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const timeoutsRef = useRef([])
  const transitionTimeoutRef = useRef(null)
  const audioRef = useRef(null)
  const { connect, disconnect, setPrompt, status, error } = useDecartStory()
  const ambient = useAmbientAudio()

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = null
    }
    setTransitioning(false)
  }, [])

  // Wraps setPrompt in a transition mask so the visual "tear" is hidden.
  const triggerBeatPrompt = useCallback(
    (prompt) => {
      setTransitioning(true)
      setPrompt(prompt)
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
      transitionTimeoutRef.current = setTimeout(() => {
        setTransitioning(false)
        transitionTimeoutRef.current = null
      }, TRANSITION_MS)
    },
    [setPrompt]
  )

  // Play a beat's prebaked narration clip. No-ops cleanly if the beat has no
  // audio field or the file is missing, so the app works with or without mp3s.
  // Always unmutes + load()s so the autoplay-unlock prime (which leaves the
  // element muted) can never leave a beat silent, and every clip starts at 0.
  const playBeatAudio = useCallback((beat) => {
    const a = audioRef.current
    if (!a || !beat.audio) return
    a.muted = false
    a.src = beat.audio
    a.load()
    a.play().catch((err) => console.warn('[audio] play failed', beat.audio, err))
  }, [])

  const handleStart = useCallback((chosenStory) => {
    setSelectedStory(chosenStory)
    setBeatIndex(0)

    // Start the ambient soundscape (creates the AudioContext within the gesture).
    ambient.start(chosenStory)

    // Unlock audio within the user gesture so later programmatic play() (fired
    // from setTimeout) isn't blocked by the browser autoplay policy. Prime with
    // the first clip played muted, then pause. playBeatAudio always unmutes, so
    // this prime can never leave the first beat silent.
    const a = audioRef.current
    const first = chosenStory.beats[0]
    if (a && first?.audio) {
      a.src = first.audio
      a.muted = true
      a.play().then(() => a.pause()).catch(() => {})
    }

    setPhase('running')
  }, [ambient])

  // Once the SDK is connected, schedule the narrative beats.
  const handleStageReady = useCallback(() => {
    clearTimeouts()

    const leadIn = selectedStory.leadInSec ?? 0

    selectedStory.beats.forEach((beat, idx) => {
      // setPrompt fires lead-in seconds early so the model has time to settle
      // before the user perceives the beat (caption/audio).
      // For beat 0 this clamps to 0 — fire immediately.
      const promptDelayMs = Math.max(0, (beat.t - leadIn) * 1000)
      const captionDelayMs = beat.t * 1000
      // Ambient crossfade has its OWN lead so the soundscape eases in slightly
      // ahead of the beat regardless of the visual leadInSec.
      const ambientDelayMs = Math.max(0, (beat.t - AMBIENT_LEAD_SEC) * 1000)

      // Beat 0's look is already applied via initialState at connect, so don't
      // re-send it here (avoids a redundant re-interpolation at the very start).
      if (idx > 0) {
        const promptId = setTimeout(() => triggerBeatPrompt(beat.prompt), promptDelayMs)
        timeoutsRef.current.push(promptId)
      }
      const ambientId = setTimeout(() => ambient.crossfadeTo(idx, beat.effectGain ?? 1), ambientDelayMs)
      // Caption + narration audio land together at the beat's perceived time.
      const captionId = setTimeout(() => {
        setBeatIndex(idx)
        playBeatAudio(beat)
      }, captionDelayMs)
      timeoutsRef.current.push(ambientId, captionId)
    })

    // End view and ambient fade are INDEPENDENT timers, so an audio hiccup can
    // never prevent the phase from flipping to "done".
    const endId = setTimeout(() => setPhase('done'), selectedStory.durationSec * 1000)
    const fadeId = setTimeout(() => ambient.fadeOut(), selectedStory.durationSec * 1000)
    timeoutsRef.current.push(endId, fadeId)
  }, [triggerBeatPrompt, clearTimeouts, selectedStory, playBeatAudio, ambient])

  useEffect(() => () => clearTimeouts(), [clearTimeouts])
  useEffect(() => () => ambient.stop(), [ambient])

  const stopAudio = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
  }, [])

  const handleRestart = useCallback(() => {
    clearTimeouts()
    stopAudio()
    ambient.stop()
    setBeatIndex(0)
    setPhase('idle')
  }, [clearTimeouts, stopAudio, ambient])

  const currentBeat = selectedStory.beats[beatIndex]

  return (
    <div className={styles.container}>
      {/* Single reusable audio element; src is swapped per beat. Narration
          play/end drives ambient ducking. */}
      <audio
        ref={audioRef}
        preload="auto"
        onPlay={() => ambient.duck()}
        onEnded={() => ambient.unduck()}
      />

      {phase === 'running' && (
        <StoryStage
          connect={connect}
          disconnect={disconnect}
          status={status}
          error={error}
          modelId={selectedStory.modelId}
          onReady={handleStageReady}
          transitioning={transitioning}
          initialPrompt={selectedStory.beats[0]?.prompt}
        />
      )}

      {phase === 'running' && status === 'connected' && currentBeat?.narration && (
        <Caption text={currentBeat.narration} />
      )}

      {phase === 'idle' && (
        <StartScreen stories={activeStories} onStart={handleStart} />
      )}

      {phase === 'done' && (
        <div className={styles.endScreen}>
          <h2>The end.</h2>
          <button className={styles.restartButton} onClick={handleRestart}>
            Start again
          </button>
        </div>
      )}
    </div>
  )
}

export default App
