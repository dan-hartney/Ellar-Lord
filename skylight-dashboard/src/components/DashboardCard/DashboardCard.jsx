import styles from './DashboardCard.module.css';

export default function DashboardCard({
  title,
  subtitle,
  children,
  onClick,
  accentColor,
  className = '',
  compact = false,
}) {
  return (
    <button
      className={`${styles.card} ${compact ? styles.compact : ''} ${className}`}
      onClick={onClick}
      style={accentColor ? { '--card-accent': accentColor } : undefined}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitles}>
          {accentColor && <div className={styles.accentDot} />}
          <h3 className={styles.title}>{title}</h3>
        </div>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      {children && <div className={styles.cardContent}>{children}</div>}
      <div className={styles.chevron}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}
