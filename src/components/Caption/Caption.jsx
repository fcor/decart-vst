import styles from './Caption.module.css'

function Caption({ text }) {
  if (!text) return null
  return (
    <div className={styles.wrapper}>
      <p className={styles.text}>{text}</p>
    </div>
  )
}

export default Caption
