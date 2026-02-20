import { useState, useRef } from 'react';
import styles from './DashboardCarousel.module.css';
import CalendarPage from './pages/CalendarPage';
import MealsPage from './pages/MealsPage';
import ListsPage from './pages/ListsPage';

const pages = [
  { id: 'calendar', label: 'Calendar', Component: CalendarPage },
  { id: 'meals', label: 'Meals', Component: MealsPage },
  { id: 'lists', label: 'Lists', Component: ListsPage },
];

export default function DashboardCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  function goTo(index) {
    setActiveIndex(index);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(e) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    const threshold = 50;
    if (touchDeltaX.current < -threshold && activeIndex < pages.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (touchDeltaX.current > threshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
    touchDeltaX.current = 0;
  }

  return (
    <div className={styles.carousel}>
      <div className={styles.pageLabels}>
        {pages.map((page, i) => (
          <button
            key={page.id}
            className={`${styles.pageLabel} ${i === activeIndex ? styles.pageLabelActive : ''}`}
            onClick={() => goTo(i)}
          >
            {page.label}
          </button>
        ))}
      </div>
      <div
        className={styles.trackWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className={styles.track}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {pages.map((page) => (
            <div key={page.id} className={styles.page}>
              <page.Component />
            </div>
          ))}
        </div>
      </div>
      <div className={styles.dots}>
        {pages.map((page, i) => (
          <button
            key={page.id}
            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to ${page.label}`}
          />
        ))}
      </div>
    </div>
  );
}
