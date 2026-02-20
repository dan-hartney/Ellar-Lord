import { calendarEvents, getFormattedDate } from '../../../data/mockData';
import styles from './CarouselPages.module.css';

export default function CalendarPage() {
  return (
    <div className={styles.carouselCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Today's Schedule</h3>
        <span className={styles.cardBadge}>{calendarEvents.length} events</span>
      </div>
      <div className={styles.eventList}>
        {calendarEvents.map((event) => (
          <div
            key={event.id}
            className={styles.eventRow}
            style={{ '--event-color': event.color }}
          >
            <div className={styles.eventTime}>
              <span className={styles.timeText}>{event.time}</span>
            </div>
            <div className={styles.eventBar} />
            <div className={styles.eventDetails}>
              <span className={styles.eventTitle}>{event.title}</span>
              <span className={styles.eventDuration}>
                {event.time} – {event.endTime}
              </span>
            </div>
            <div className={styles.eventAvatar} style={{ background: event.color }}>
              {event.member[0].toUpperCase()}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <span className={styles.footerText}>View full calendar</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}
