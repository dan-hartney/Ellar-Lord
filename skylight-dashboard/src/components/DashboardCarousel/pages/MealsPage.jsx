import { meals } from '../../../data/mockData';
import styles from './CarouselPages.module.css';

const mealIcons = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
};

const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

export default function MealsPage() {
  const mealEntries = Object.entries(meals);
  const plannedCount = mealEntries.filter(([, m]) => m.planned).length;

  return (
    <div className={styles.carouselCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Today's Meals</h3>
        <span className={styles.cardBadge}>{plannedCount}/{mealEntries.length} planned</span>
      </div>
      <div className={styles.mealList}>
        {mealEntries.map(([key, meal]) => (
          <div key={key} className={styles.mealRow}>
            <span className={styles.mealIcon}>{mealIcons[key]}</span>
            <div className={styles.mealDetails}>
              <span className={styles.mealLabel}>{mealLabels[key]}</span>
              <span className={styles.mealName}>
                {meal.planned ? meal.name : 'No meal planned'}
              </span>
            </div>
            {meal.planned && (
              <div className={styles.mealCheck}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pastel-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.footerText}>View meal plan</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
