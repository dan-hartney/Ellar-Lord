import DashboardSection from '../DashboardSection/DashboardSection';
import DashboardCard from '../DashboardCard/DashboardCard';
import { tasks, rewards, habits } from '../../data/mockData';
import styles from './TasksSection.module.css';

const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TasksSection() {
  return (
    <DashboardSection title="Tasks" seeAll={() => {}}>
      {/* Task Status Card */}
      <DashboardCard
        title="Family Progress"
        subtitle="Today"
        accentColor="var(--pastel-green)"
        onClick={() => {}}
      >
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${tasks.familyProgress * 100}%` }}
            />
          </div>
          <span className={styles.progressLabel}>
            {tasks.completedTasks}/{tasks.totalTasks} tasks done
          </span>
        </div>
        <div className={styles.memberRow}>
          {tasks.members.map((member) => (
            <div key={member.id} className={styles.memberChip}>
              <div
                className={styles.memberAvatar}
                style={{ background: member.color }}
              >
                {member.avatar}
              </div>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{member.name}</span>
                <div className={styles.miniProgress}>
                  <div
                    className={styles.miniProgressFill}
                    style={{
                      width: `${member.progress * 100}%`,
                      background: member.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      {/* Stars / Rewards Card */}
      <DashboardCard
        title="Stars & Rewards"
        subtitle="This week"
        accentColor="var(--pastel-yellow)"
        onClick={() => {}}
      >
        <div className={styles.rewardsSection}>
          <div className={styles.starsDisplay}>
            <span className={styles.starIcon}>&#9733;</span>
            <span className={styles.starCount}>{rewards.totalStarsWeek}</span>
            <span className={styles.starLabel}>stars this week</span>
          </div>
          <div className={styles.rewardProgress}>
            <div className={styles.rewardInfo}>
              <span className={styles.rewardName}>Next: {rewards.nextReward}</span>
              <span className={styles.rewardFraction}>
                {rewards.currentStars}/{rewards.nextRewardStars}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFillReward}
                style={{
                  width: `${(rewards.currentStars / rewards.nextRewardStars) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Habits Card */}
      <DashboardCard
        title="Habits"
        subtitle="This week"
        accentColor="var(--pastel-purple)"
        onClick={() => {}}
      >
        <div className={styles.habitsSection}>
          {habits.map((habit) => (
            <div key={habit.id} className={styles.habitRow}>
              <div className={styles.habitInfo}>
                <span className={styles.habitName}>{habit.name}</span>
                <span className={styles.habitStreak}>{habit.streak} day streak</span>
              </div>
              <div className={styles.habitDots}>
                {habit.weekProgress.map((done, i) => (
                  <div key={i} className={styles.habitDotWrapper}>
                    <div
                      className={`${styles.habitDot} ${done ? styles.habitDotDone : ''}`}
                    />
                    <span className={styles.habitDayLabel}>{dayLabels[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </DashboardSection>
  );
}
