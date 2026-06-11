import { useRef, useEffect, useState } from 'react'
import { models } from '@decartai/sdk'
import styles from './StoryStage.module.css'

function StoryStage({ connect, disconnect, status, error: sdkError, modelId, onReady }) {
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
            facingMode: 'user',
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
          await connect(stream, outputVideoRef.current, modelId)
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
  }, [modelId, connect, disconnect, onReady])

  if (cameraError) {
    return <div className={styles.error}>Camera error: {cameraError}</div>
  }

  return (
    <div className={styles.wrapper}>
      <video
        ref={localVideoRef}
        className={`${styles.video} ${status === 'connected' ? styles.hidden : ''}`}
        autoPlay
        playsInline
        muted
      />
      <video
        ref={outputVideoRef}
        className={`${styles.video} ${status !== 'connected' ? styles.hidden : ''}`}
        autoPlay
        playsInline
        muted
      />
      {status === 'connecting' && (
        <div className={styles.overlay}>Preparing the story…</div>
      )}
      {sdkError && (
        <div className={styles.overlay}>{sdkError}</div>
      )}
    </div>
  )
}

export default StoryStage
