import { useRef, useEffect, useState } from 'react'
import { models } from '@decartai/sdk'
import styles from './StoryStage.module.css'

function StoryStage({ connect, disconnect, status, error: sdkError, modelId, onReady, transitioning, initialPrompt, facingMode = 'user' }) {
  const localVideoRef = useRef(null)
  const outputVideoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const model = models.realtime(modelId)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: model.width },
            height: { ideal: model.height },
            frameRate: { ideal: model.fps },
            facingMode: { ideal: facingMode },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        streamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        if (outputVideoRef.current) {
          await connect(stream, outputVideoRef.current, modelId, initialPrompt)
          if (!cancelled) onReady?.()
        }
      } catch (err) {
        setCameraError(err.message)
      }
    }

    start()

    return () => {
      cancelled = true
      disconnect()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [modelId, connect, disconnect, onReady, initialPrompt, facingMode])

  if (cameraError) {
    return <div className={styles.error}>Camera error: {cameraError}</div>
  }

  // Mirror the display only for the front camera (selfie feel). The rear camera
  // must show as-is, or text/scenes in the environment come out backwards.
  const mirrored = facingMode === 'user'

  return (
    <div className={styles.wrapper}>
      <video
        ref={localVideoRef}
        className={[
          styles.video,
          mirrored ? styles.mirrored : '',
          status === 'connected' ? styles.hidden : '',
        ].filter(Boolean).join(' ')}
        autoPlay
        playsInline
        muted
      />
      <video
        ref={outputVideoRef}
        className={[
          styles.video,
          mirrored ? styles.mirrored : '',
          status !== 'connected' ? styles.hidden : '',
          transitioning ? styles.transitioning : '',
        ].filter(Boolean).join(' ')}
        autoPlay
        playsInline
        muted
      />
      {status === 'connecting' && (
        <div className={styles.overlay}>
          <div className={styles.preparing}>
            <span className={styles.dots} aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <p>Preparing the story…</p>
          </div>
        </div>
      )}
      {sdkError && (
        <div className={styles.overlay}><p>{sdkError}</p></div>
      )}
    </div>
  )
}

export default StoryStage
