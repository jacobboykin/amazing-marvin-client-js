// Base interfaces
export interface BaseMarvinItem {
  _id: string;
  _rev?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Task-related types
export interface Subtask {
  _id: string;
  title: string;
  done: boolean;
  rank: number;
  timeEstimate?: number;
}

export interface Task extends BaseMarvinItem {
  title: string;
  parentId?: string;
  dueDate?: string;
  startDate?: string;
  endDate?: string;
  day?: string;
  firstScheduled?: string;
  plannedWeek?: string;
  plannedMonth?: string;
  sprintId?: string;
  rank?: number;
  masterRank?: number;
  done: boolean;
  completedAt?: number;
  duration?: number;
  times?: number[];
  firstTracked?: number;
  doneAt?: number;
  isReward?: boolean;
  isStarred?: boolean | number;
  isFrogged?: boolean | number;
  isPinned?: boolean;
  pinId?: string;
  recurring?: boolean;
  recurringTaskId?: string;
  echo?: boolean;
  echoId?: string;
  link?: string;
  subtasks?: Record<string, Subtask>;
  colorBar?: string;
  labelIds?: string[];
  timeEstimate?: number;
  note?: string;
  email?: string;
  dailySection?: string;
  bonusSection?: string;
  customSection?: string;
  timeBlockSection?: string;
  dependsOn?: Record<string, boolean>;
  backburner?: boolean;
  reviewDate?: string;
  itemSnoozeTime?: number;
  permaSnoozeTime?: string;
  calId?: string;
  calURL?: string;
  etag?: string;
  calData?: string;
  generatedAt?: number;
  echoedAt?: number;
  deletedAt?: number;
  restoredAt?: number;
  onboard?: boolean;
  imported?: boolean;
  marvinPoints?: number;
  mpNotes?: string[];
  rewardPoints?: number;
  rewardId?: string;
  workedOnAt?: number;
  
  // Goals
  [key: `g_in_${string}`]: boolean;
  [key: `g_sec_${string}`]: string;
  [key: `g_rank_${string}`]: number;
  
  // New reminder format
  taskTime?: string;
  reminderOffset?: number;
  reminderTime?: string;
  snooze?: number;
  autoSnooze?: number;
  
  // Old reminder format
  remindAt?: string;
  reminder?: {
    time: string;
    diff: number;
  };
}

export interface Project extends BaseMarvinItem {
  title: string;
  type: 'project';
  parentId?: string;
  rank?: number;
  dayRank?: number;
  day?: string;
  firstScheduled?: string;
  dueDate?: string;
  labelIds?: string[];
  timeEstimate?: number;
  startDate?: string;
  endDate?: string;
  plannedWeek?: string;
  plannedMonth?: string;
  sprintId?: string;
  done?: boolean;
  doneDate?: string;
  priority?: 'low' | 'mid' | 'high';
  color?: string;
  icon?: string;
  note?: string;
  recurring?: boolean;
  recurringTaskId?: string;
  echo?: boolean;
  isFrogged?: boolean | number;
  reviewDate?: string;
  marvinPoints?: number;
  mpNotes?: string[];
  workedOnAt?: number;
}

export interface Category extends BaseMarvinItem {
  title: string;
  type?: 'category';
  parentId: string;
  rank?: number;
  color?: string;
  icon?: string;
  note?: string;
  workedOnAt?: number;
}

// Event-related types
export interface Event extends BaseMarvinItem {
  title: string;
  isAllDay?: boolean;
  parentId?: string;
  labelIds?: string[];
  start: string;
  length: number;
  calId?: string;
  calURL?: string;
  etag?: string;
  calData?: string;
  cancelDates?: Record<string, boolean>;
  exceptions?: Record<string, {
    etag: string;
    calData: string;
    start: string;
    title: string;
    length: number;
  }>;
  note?: string;
  hidden?: boolean;
  timeZoneFix?: number;
}

// Label-related types
export interface Label extends BaseMarvinItem {
  title: string;
  groupId?: string;
  color?: string;
  icon?: string;
  showAs?: 'text' | 'icon' | 'both';
  isAction?: boolean;
  isHidden?: boolean;
}


// Time tracking types
export interface TrackResponse {
  startId?: string;
  startTimes: number[];
  stopId?: string | null;
  stopTimes: number[];
  issues: string[];
}

export interface TrackInfo {
  taskId: string;
  times: number[];
}

// Time block types
export interface TimeBlock extends BaseMarvinItem {
  title: string;
  date: string;
  time: string;
  duration: string;
  isSection?: boolean;
  calId?: string;
  calURL?: string;
  etag?: string;
  calData?: string;
  cancelDates?: Record<string, boolean>;
  exceptions?: Record<string, {
    etag: string;
    calData: string;
    date: string;
    title: string;
    time: string;
    duration: string;
  }>;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
  };
  note?: string;
}

// Goal-related types
export interface GoalSection {
  _id: string;
  title: string;
  note?: string;
}

export interface Challenge {
  _id: string;
  challenge: string;
  action: string;
}

export interface Goal extends BaseMarvinItem {
  title: string;
  note?: string;
  hideInDayView?: boolean;
  parentId?: string;
  isStarred?: number;
  labelIds?: string[];
  importance?: number;
  difficulty?: number;
  motivations?: string[];
  challenges?: Challenge[];
  committed?: boolean;
  expectedTasks?: number;
  expectedDuration?: number;
  expectedHabits?: number;
  checkIn?: boolean;
  checkIns?: number[];
  lastCheckIn?: string;
  checkInWeeks?: number;
  checkInStart?: string;
  checkInQuestions?: {
    _id: string;
    title: string;
  }[];
  status: 'backburner' | 'pending' | 'active' | 'done';
  startedAt?: number;
  color?: string;
  dueDate?: string;
  hasEnd: boolean;
  sections?: GoalSection[];
  taskProgress?: boolean;
  [key: `trackerProgress_${string}`]: boolean;
}

// Habit-related types
export interface Habit extends BaseMarvinItem {
  title: string;
  note?: string;
  color?: string;
  parentId?: string;
  labelIds?: string[];
  isStarred?: number;
  isFrogged?: number;
  timeEstimate?: number;
  startDate?: string;
  endDate?: string;
  units?: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  target: number;
  isPositive: boolean;
  recordType: 'boolean' | 'number';
  showInDayView?: boolean;
  showInCalendar?: boolean;
  askOn?: number[];
  startTime?: string;
  endTime?: string;
  time?: string;
  showAfterSuccess?: boolean;
  showAfterRecord?: boolean;
  done?: boolean;
  history?: number[];
  dismissed?: string;
}


// Reminder types
export interface Reminder {
  time: number;
  offset: number;
  reminderId: string;
  type: 'T' | 'M' | 'DT' | 'DP' | 't';
  title: string;
  snooze: number;
  autoSnooze: boolean;
  canTrack: boolean;
}

// Profile and user info types
export interface Profile {
  userId: string;
  email: string;
  parentEmail?: string;
  emailConfirmed?: boolean;
  billingPeriod: 'TRIAL' | 'MONTH' | 'YEAR' | 'ONCE' | 'PAID';
  paidThrough?: string;
  iosSub?: boolean;
  marvinPoints?: number;
  nextMultiplier?: number;
  rewardPointsEarned?: number;
  rewardPointsSpent?: number;
  rewardPointsEarnedToday?: number;
  rewardPointsSpentToday?: number;
  rewardPointsLastDate?: string;
  tomatoes?: number;
  tomatoesToday?: number;
  tomatoTime?: number;
  tomatoTimeToday?: number;
  tomatoDate?: string;
  defaultSnooze?: number;
  defaultAutoSnooze?: boolean;
  defaultOffset?: number;
  tracking?: string;
  trackingSince?: number;
  currentVersion?: string;
  signupAppVersion?: string;
}

export interface KudosInfo {
  kudos: number;
  level: number;
  kudosRemaining: number;
}

// Reward types
export interface RewardPointsOperation {
  /** Number of points to claim/spend (required for CLAIM and SPEND operations) */
  points?: number;
  /** ID of the item being rewarded (required for CLAIM and UNCLAIM operations) */
  itemId: string;
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Type of reward operation */
  op: 'CLAIM' | 'UNCLAIM' | 'SPEND';
}

// Client configuration
export interface MarvinClientConfig {
  /** The Amazing Marvin API token (limited access token, not full access) */
  apiToken: string;
  /** Base URL for the API. Defaults to https://serv.amazingmarvin.com/api */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 10000 (10 seconds) */
  timeout?: number;
  /** Maximum number of retry attempts for failed requests. Defaults to 3 */
  retries?: number;
  /** Delay between retry attempts in milliseconds. Defaults to 1000 (1 second) */
  retryDelay?: number;
  /** Custom fetch implementation for testing or Node.js environments */
  fetch?: typeof fetch;
}

// Error handling
export interface MarvinApiError {
  message: string;
  status: number;
  statusText: string;
  endpoint: string;
  method: string;
  timestamp: number;
  /** Optional server-provided retry delay in milliseconds (from Retry-After) */
  retryAfterMs?: number;
}

// API request/response types
export interface AddTaskRequest {
  title: string;
  done: boolean;
  day?: string;
  parentId?: string;
  labelIds?: string[];
  firstScheduled?: string;
  rank?: number;
  dailySection?: string;
  bonusSection?: string;
  customSection?: string;
  timeBlockSection?: string;
  note?: string;
  dueDate?: string;
  timeEstimate?: number;
  isReward?: boolean;
  isStarred?: boolean | number;
  isFrogged?: boolean | number;
  plannedWeek?: string;
  plannedMonth?: string;
  rewardPoints?: number;
  rewardId?: string;
  backburner?: boolean;
  reviewDate?: string;
  itemSnoozeTime?: number;
  permaSnoozeTime?: string;
  timeZoneOffset?: number;
}

export interface AddProjectRequest {
  title: string;
  done: boolean;
  day?: string;
  parentId?: string;
  labelIds?: string[];
  firstScheduled?: string;
  rank?: number;
  dailySection?: string;
  bonusSection?: string;
  customSection?: string;
  timeBlockSection?: string;
  note?: string;
  dueDate?: string;
  timeEstimate?: number;
  isReward?: boolean;
  priority?: 'low' | 'mid' | 'high';
  isFrogged?: boolean | number;
  plannedWeek?: string;
  plannedMonth?: string;
  rewardPoints?: number;
  rewardId?: string;
  backburner?: boolean;
  reviewDate?: string;
  itemSnoozeTime?: number;
  permaSnoozeTime?: string;
  timeZoneOffset?: number;
}

export interface AddEventRequest {
  title: string;
  note?: string;
  length: number;
  start: string;
}

export interface MarkDoneRequest {
  itemId: string;
  timeZoneOffset?: number;
}

export interface TrackRequest {
  taskId: string;
  action: 'START' | 'STOP';
}

export interface TracksRequest {
  taskIds: string[];
}

export interface UpdateHabitRequest {
  habitId: string;
  time?: number;
  value?: number;
  updateDB?: boolean;
  undo?: boolean;
  history?: number[];
}

export interface SetRemindersRequest {
  reminders: Reminder[];
}

export interface DeleteRemindersRequest {
  reminderIds: string[];
}
