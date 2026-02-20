import { lists } from '../../../data/mockData';
import styles from './CarouselPages.module.css';

export default function ListsPage() {
  const totalItems = lists.reduce((sum, l) => sum + l.itemCount, 0);
  const totalCompleted = lists.reduce((sum, l) => sum + l.completedCount, 0);

  return (
    <div className={styles.carouselCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Your Lists</h3>
        <span className={styles.cardBadge}>{totalCompleted}/{totalItems} items done</span>
      </div>
      <div className={styles.listGrid}>
        {lists.slice(0, 4).map((list) => (
          <div key={list.id} className={styles.listItem}>
            <div
              className={styles.listColor}
              style={{ background: list.color }}
            />
            <div className={styles.listDetails}>
              <span className={styles.listName}>{list.name}</span>
              <span className={styles.listCount}>
                {list.completedCount}/{list.itemCount}
              </span>
            </div>
            <div className={styles.listProgress}>
              <div
                className={styles.listProgressFill}
                style={{
                  width: `${(list.completedCount / list.itemCount) * 100}%`,
                  background: list.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.footerText}>View all lists</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
