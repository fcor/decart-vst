import { useState } from 'react'
import styles from './StartScreen.module.css'

function StartScreen({
  stories,
  onStart,
  showCameraToggle = false,
  facingMode = 'user',
  onFacingChange,
}) {
  const [selectedId, setSelectedId] = useState(stories[0]?.id)
  const selected = stories.find((s) => s.id === selectedId) ?? stories[0]

  // Front/rear camera toggle (mobile/tablet only). Rear lets the user scan the
  // world around them, where the restyle is most striking.
  const cameraToggle = showCameraToggle ? (
    <div className={styles.cameraToggle} role="group" aria-label="Camera">
      <button
        type="button"
        className={`${styles.cameraOption} ${facingMode === 'environment' ? styles.cameraOptionActive : ''}`}
        onClick={() => onFacingChange?.('environment')}
        aria-pressed={facingMode === 'environment'}
      >
        Rear
      </button>
      <button
        type="button"
        className={`${styles.cameraOption} ${facingMode === 'user' ? styles.cameraOptionActive : ''}`}
        onClick={() => onFacingChange?.('user')}
        aria-pressed={facingMode === 'user'}
      >
        Front
      </button>
    </div>
  ) : null

  // Single active story → skip the picker, show a clean focused intro.
  if (stories.length === 1) {
    const only = stories[0]
    return (
      <div className={styles.wrapper}>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>A {only.durationSec}-second story</p>
          <h1 className={styles.title}>{only.title}</h1>
          <p className={styles.copy}>{only.pitch}</p>
          {cameraToggle}
          <button className={styles.button} onClick={() => onStart(only)}>
            Begin
          </button>
          <p className={styles.note}>Sound on for the best experience</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>Choose your story</p>

        <ul className={styles.storyList}>
          {stories.map((s) => {
            const isSelected = s.id === selected.id
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`${styles.storyCard} ${isSelected ? styles.storyCardSelected : ''}`}
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={isSelected}
                >
                  <span className={styles.storyTitle}>{s.title}</span>
                  <span className={styles.storyPitch}>{s.pitch}</span>
                  <span className={styles.storyMeta}>{s.durationSec}s</span>
                </button>
              </li>
            )
          })}
        </ul>

        <p className={styles.copy}>
          Step into the frame. We'll ask for camera access, then the story will unfold around you.
        </p>
        {cameraToggle}
        <button className={styles.button} onClick={() => onStart(selected)}>
          Begin
        </button>
        <p className={styles.note}>Sound on for the best experience</p>
      </div>
    </div>
  )
}

export default StartScreen
