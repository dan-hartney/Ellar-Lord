import styles from './DashboardSection.module.css';

export default function DashboardSection({ title, seeAll, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {seeAll && (
          <button className={styles.seeAll} onClick={seeAll}>
            See All
          </button>
        )}
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}
