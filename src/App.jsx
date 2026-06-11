import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import StartScreen from './components/StartScreen/StartScreen'
import StoryStage from './components/StoryStage/StoryStage'
import Caption from './components/Caption/Caption'
import { useDecartStory } from './hooks/useDecartStory'
import { story } from './data/story'

function App() {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [beatIndex, setBeatIndex] = useState(0)
  const timeoutsRef = useRef([])
  const { connect, disconnect, setPrompt, status, error } = useDecartStory()

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const handleStart = useCallback(() => {
    setPhase('running')
    setBeatIndex(0)
  }, [])

  // Once the SDK is connected, schedule the narrative beats.
  const handleStageReady = useCallback(() => {
    clearTimeouts()

    // Apply first beat immediately, then schedule the rest.
    const [first, ...rest] = story.beats
    setPrompt(first.prompt)
    setBeatIndex(0)

    rest.forEach((beat, idx) => {
      const id = setTimeout(() => {
        setPrompt(beat.prompt)
        setBeatIndex(idx + 1)
      }, beat.t * 1000)
      timeoutsRef.current.push(id)
    })

    const endId = setTimeout(() => setPhase('done'), story.durationSec * 1000)
    timeoutsRef.current.push(endId)
  }, [setPrompt, clearTimeouts])

  useEffect(() => () => clearTimeouts(), [clearTimeouts])

  const handleRestart = useCallback(() => {
    clearTimeouts()
    setBeatIndex(0)
    setPhase('idle')
  }, [clearTimeouts])

  const currentBeat = story.beats[beatIndex]

  return (
    <div className={styles.container}>
      {phase === 'running' && (
        <StoryStage
          connect={connect}
          disconnect={disconnect}
          status={status}
          error={error}
          modelId={story.modelId}
          onReady={handleStageReady}
        />
      )}

      {phase === 'running' && status === 'connected' && currentBeat?.narration && (
        <Caption text={currentBeat.narration} />
      )}

      {phase === 'idle' && (
        <StartScreen
          title={story.title}
          durationSec={story.durationSec}
          onStart={handleStart}
        />
      )}

      {phase === 'done' && (
        <div className={styles.endScreen}>
          <h2>The end.</h2>
          <button className={styles.restartButton} onClick={handleRestart}>
            Tell it again
          </button>
        </div>
      )}
    </div>
  )
}

export default App
