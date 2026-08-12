import type { CourseFormData as SchedulerCourseFormData } from '#shared/schemas/schedulerSchema';

// Days of the week
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type Day = (typeof DAYS)[number];

// Vietnamese day names. Single source of truth — the grid, the day toggle and
// the course sheet all label the same six columns.
export const DAY_LABELS: Record<Day, string> = {
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
};

// Compact form, for column headers and narrow viewports.
export const DAY_SHORT_LABELS: Record<Day, string> = {
  Mon: 'T2',
  Tue: 'T3',
  Wed: 'T4',
  Thu: 'T5',
  Fri: 'T6',
  Sat: 'T7',
};

// `Date.getDay()` returns 0 for Sunday, which has no column.
const WEEKDAY_INDEX_TO_DAY: Record<number, Day> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export function dayFromDate(date: Date): Day | null {
  return WEEKDAY_INDEX_TO_DAY[date.getDay()] ?? null;
}

// Session numbers
export const SESSIONS = [1, 2, 3, 4] as const;
export type SessionNumber = (typeof SESSIONS)[number];

// Course types
export const COURSE_TYPES = ['theory', 'practical'] as const;
export type CourseType = (typeof COURSE_TYPES)[number];

// Session Configuration
export interface SessionConfig {
  id: number;
  scheduleId: string;
  sessionNumber: SessionNumber;
  startTime: string; // Format: "HH:MM"
  duration: number; // Duration in minutes
}

// Course
export interface Course {
  id: number;
  scheduleId: string;
  name: string;
  instructor: string;
  credits: number;
  room: string;
  day: Day;
  session: SessionNumber;
  courseType: CourseType;
  studyGroup?: string;
  code?: string;
  notes?: string;
  createdAt: Date;
}

// Schedule
export interface Schedule {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schedule with relations
export interface ScheduleWithRelations extends Schedule {
  sessionsConfig: SessionConfig[];
  courses: Course[];
}

export type CourseFormData = SchedulerCourseFormData;

// Grid data structure
export interface GridCell {
  day: Day;
  session: SessionNumber;
  courses: Course[];
}
