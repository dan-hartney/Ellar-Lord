/* Mock data for Skylight Dashboard prototype */

export const familyMembers = [
  { id: 'dan', name: 'Dan', avatar: 'D', color: '#F8B4C8' },
  { id: 'krisna', name: 'Krisna', avatar: 'K', color: '#A0C4E8' },
  { id: 'family', name: 'Family', avatar: 'F', color: '#A8D8B9' },
];

export const calendarEvents = [
  {
    id: 1,
    title: 'School Drop-off',
    time: '8:00 AM',
    endTime: '8:30 AM',
    color: '#F5D98C',
    member: 'dan',
  },
  {
    id: 2,
    title: 'Soccer Practice',
    time: '3:30 PM',
    endTime: '5:00 PM',
    color: '#F8B4C8',
    member: 'krisna',
  },
  {
    id: 3,
    title: 'Family Dinner',
    time: '6:00 PM',
    endTime: '7:00 PM',
    color: '#A8D8B9',
    member: 'family',
  },
];

export const meals = {
  breakfast: { name: 'Oatmeal & Berries', planned: true },
  lunch: { name: 'Turkey Wraps', planned: true },
  dinner: { name: 'Pasta Night', planned: true },
};

export const lists = [
  {
    id: 1,
    name: 'Grocery List',
    color: '#F5C4A1',
    itemCount: 12,
    completedCount: 5,
    topItems: ['Milk', 'Eggs', 'Bread'],
  },
  {
    id: 2,
    name: 'Dan Work List',
    color: '#C4A8E0',
    itemCount: 7,
    completedCount: 2,
    topItems: ['Review PRD', 'Team standup', 'Send report'],
  },
  {
    id: 3,
    name: 'Shopping',
    color: '#A0C4E8',
    itemCount: 4,
    completedCount: 0,
    topItems: ['New shoes', 'Birthday gift', 'School supplies'],
  },
  {
    id: 4,
    name: 'To-Do List',
    color: '#F8B4C8',
    itemCount: 9,
    completedCount: 6,
    topItems: ['Clean garage', 'Call dentist', 'Book flights'],
  },
];

export const tasks = {
  familyProgress: 0.5,
  totalTasks: 14,
  completedTasks: 7,
  members: [
    { id: 'dan', name: 'Dan', avatar: 'D', color: '#F8B4C8', progress: 0.6, stars: 6, tasksRemaining: 3 },
    { id: 'krisna', name: 'Krisna', avatar: 'K', color: '#A0C4E8', progress: 0.4, stars: 4, tasksRemaining: 5 },
  ],
  todayTasks: [
    { id: 1, title: 'Make bed', done: true, time: 'Morning', member: 'dan' },
    { id: 2, title: 'Brush teeth', done: true, time: 'Morning', member: 'dan' },
    { id: 3, title: 'Read 20 minutes', done: false, time: 'Afternoon', member: 'dan' },
    { id: 4, title: 'Homework', done: false, time: 'Afternoon', member: 'krisna' },
    { id: 5, title: 'Set the table', done: false, time: 'Evening', member: 'family' },
  ],
};

export const rewards = {
  totalStarsToday: 10,
  totalStarsWeek: 42,
  nextReward: 'Movie Night',
  nextRewardStars: 50,
  currentStars: 42,
};

export const habits = [
  { id: 1, name: 'Reading', streak: 5, completedToday: true, weekProgress: [true, true, true, false, true, true, false] },
  { id: 2, name: 'Exercise', streak: 3, completedToday: false, weekProgress: [true, false, true, true, true, false, false] },
  { id: 3, name: 'Chores', streak: 7, completedToday: true, weekProgress: [true, true, true, true, true, true, true] },
];

export const sidekick = {
  lastImport: {
    timestamp: '2 hours ago',
    status: 'success',
    type: 'Photo',
  },
  nextActivity: 'Build a blanket fort',
};

export function getFormattedDate() {
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return now.toLocaleDateString('en-US', options);
}
