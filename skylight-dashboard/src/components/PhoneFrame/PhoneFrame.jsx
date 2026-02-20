import styles from './PhoneFrame.module.css';

export default function PhoneFrame({ children }) {
  return (
    <div className={styles.frame}>
      <div className={styles.notch}>
        <div className={styles.notchInner} />
      </div>
      <div className={styles.screen}>{children}</div>
      <div className={styles.homeIndicator}>
        <div className={styles.homeBar} />
      </div>
    </div>
  );
}
