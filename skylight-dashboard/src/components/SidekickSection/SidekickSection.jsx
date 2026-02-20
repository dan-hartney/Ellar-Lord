import DashboardSection from '../DashboardSection/DashboardSection';
import DashboardCard from '../DashboardCard/DashboardCard';
import { sidekick } from '../../data/mockData';
import styles from './SidekickSection.module.css';

export default function SidekickSection() {
  return (
    <DashboardSection title="Sidekick">
      {/* Quick Actions — Photo + Talk prominently displayed */}
      <div className={styles.quickActions}>
        <button className={styles.quickAction} onClick={() => {}}>
          <div className={`${styles.quickActionIcon} ${styles.photoIcon}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
          <span className={styles.quickActionLabel}>Photo</span>
          <span className={styles.quickActionDesc}>Upload a photo</span>
        </button>
        <button className={styles.quickAction} onClick={() => {}}>
          <div className={`${styles.quickActionIcon} ${styles.talkIcon}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <span className={styles.quickActionLabel}>Talk</span>
          <span className={styles.quickActionDesc}>Voice import</span>
        </button>
      </div>

      {/* Sidekick Cards */}
      <DashboardCard
        title="Import"
        subtitle="Quick add"
        accentColor="var(--pastel-green)"
        onClick={() => {}}
      >
        <p className={styles.cardText}>Bring in photos, events, or content</p>
      </DashboardCard>

      <DashboardCard
        title="Import History"
        subtitle={sidekick.lastImport.timestamp}
        accentColor="var(--pastel-blue)"
        onClick={() => {}}
      >
        <div className={styles.importStatus}>
          <div className={`${styles.statusDot} ${styles[sidekick.lastImport.status]}`} />
          <span className={styles.statusText}>
            Last import: {sidekick.lastImport.type} — {sidekick.lastImport.status}
          </span>
        </div>
      </DashboardCard>

      <DashboardCard
        title="Activity Planner"
        subtitle="Today"
        accentColor="var(--pastel-yellow)"
        onClick={() => {}}
      >
        <p className={styles.activitySuggestion}>{sidekick.nextActivity}</p>
      </DashboardCard>
    </DashboardSection>
  );
}
