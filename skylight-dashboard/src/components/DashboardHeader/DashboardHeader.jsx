import { getFormattedDate } from '../../data/mockData';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.dateRow}>
        <span className={styles.date}>{getFormattedDate()}</span>
      </div>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Home</h1>
        <button className={styles.settingsButton} aria-label="Settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </header>
  );
}
