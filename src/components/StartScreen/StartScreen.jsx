import styles from './StartScreen.module.css'

function StartScreen({ title, durationSec, onStart }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>A {durationSec}-second story</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.copy}>
          Step into the frame. We'll ask for camera access, then the story will unfold around you.
        </p>
        <button className={styles.button} onClick={onStart}>
          Begin
        </button>
        <p className={styles.note}>Sound on for the best experience</p>
      </div>
    </div>
  )
}

export default StartScreen
