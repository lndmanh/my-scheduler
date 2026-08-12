import type { Course, SessionConfig, Day } from '~~/types/scheduler';

/**
 * Maps scheduler day abbreviations to ISO weekday numbers (1 = Monday, 7 = Sunday).
 */
const DAY_TO_ISO_WEEKDAY: Record<Day, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Pads a number to 2 digits with a leading zero if necessary.
 */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Formats a Date object into an ICS datetime string (local time, no timezone).
 * Format: YYYYMMDDTHHMMSS
 */
function formatICSDate(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
}

/**
 * Generates a simple unique ID for ICS VEVENT UID fields.
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}@my-scheduler`;
}

/**
 * Escapes special characters in ICS text fields.
 * Commas, semicolons, and backslashes must be escaped.
 * Newlines must use literal \n representation.
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Gets the date for a specific ISO weekday in the current week.
 * The week starts on Monday.
 */
function getDateForWeekday(isoWeekday: number, referenceDate: Date = new Date()): Date {
  const currentDay = referenceDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const currentISODay = currentDay === 0 ? 7 : currentDay; // Convert to ISO (1-7, Mon-Sun)
  const diff = isoWeekday - currentISODay;

  const result = new Date(referenceDate);
  result.setDate(result.getDate() + diff);
  return result;
}

/**
 * Builds a description string from course metadata.
 */
function buildDescription(course: Course): string {
  const parts: string[] = [];

  parts.push(`Giảng viên: ${course.instructor}`);
  parts.push(`Tín chỉ: ${course.credits}`);
  parts.push(`Loại: ${course.courseType === 'theory' ? 'Lý thuyết' : 'Thực hành'}`);

  if (course.code) parts.push(`Mã HP: ${course.code}`);
  if (course.studyGroup) parts.push(`Nhóm: ${course.studyGroup}`);
  if (course.notes) parts.push(`Ghi chú: ${course.notes}`);

  return parts.join('\\n');
}

/**
 * Generates an ICS (iCalendar) string from the scheduler data.
 *
 * Each course is mapped to a VEVENT on the corresponding day of the current week,
 * using the session configuration for start time and duration.
 *
 * @param courses - Array of courses to export
 * @param sessionsConfig - Array of session configurations with start times and durations
 * @param scheduleName - Name of the schedule (used as calendar name)
 * @returns The complete ICS file content as a string
 */
export function generateICS(
  courses: Course[],
  sessionsConfig: SessionConfig[],
  scheduleName: string,
): string {
  const sessionMap = new Map(sessionsConfig.map((s) => [s.sessionNumber, s]));
  const now = new Date();
  const lines: string[] = [];

  // ICS Header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//My Scheduler//ICS Export//VI');
  lines.push(`X-WR-CALNAME:${escapeICSText(scheduleName)}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');

  for (const course of courses) {
    const session = sessionMap.get(course.session);
    if (!session) {
      // Skip courses without a configured session
      continue;
    }

    // Parse session start time
    const [hours, minutes] = session.startTime.split(':').map(Number);
    const isoWeekday = DAY_TO_ISO_WEEKDAY[course.day];

    // Calculate start and end dates
    const startDate = getDateForWeekday(isoWeekday, now);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + session.duration * 60 * 1000);

    // Build VEVENT
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${generateUID()}`);
    lines.push(`DTSTAMP:${formatICSDate(now)}`);
    lines.push(`DTSTART:${formatICSDate(startDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:${escapeICSText(course.name)}`);
    lines.push(`LOCATION:${escapeICSText(course.room)}`);
    lines.push(`DESCRIPTION:${buildDescription(course)}`);
    lines.push('END:VEVENT');
  }

  // ICS Footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}
