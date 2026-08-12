import type { SessionConfig, SessionNumber } from '~~/types/scheduler';

export interface SessionRange {
  sessionNumber: SessionNumber;
  startMinutes: number;
  endMinutes: number;
}

export interface NowPosition {
  sessionNumber: SessionNumber;
  /** 0-1 down the session's row. */
  fraction: number;
  /** False when the clock is in the gap after this session rather than inside it. */
  inSession: boolean;
}

/** Minutes since midnight for a `"HH:MM"` string, or null if unparseable. */
export function parseTimeToMinutes(value: string | undefined | null): number | null {
  if (!value) return null;

  const [rawHours, rawMinutes] = value.split(':');
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinutes(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Parsed, time-ordered session ranges. Sessions with unusable times are dropped. */
export function getSessionRanges(sessions: SessionConfig[]): SessionRange[] {
  return sessions
    .map((session) => {
      const startMinutes = parseTimeToMinutes(session.startTime);
      if (startMinutes === null) return null;

      const duration = Number.isFinite(session.duration) ? Math.max(0, session.duration) : 0;

      return {
        sessionNumber: session.sessionNumber,
        startMinutes,
        endMinutes: startMinutes + duration,
      } satisfies SessionRange;
    })
    .filter((range): range is SessionRange => range !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Where "now" sits on the grid.
 *
 * The grid's rows are sessions, not proportional time: rows are equal height,
 * sessions differ in length, and there are unscheduled gaps between them. So a
 * single day-long proportional scale is not available. Instead the marker is
 * placed within the row of the session currently running, and parked on that
 * row's bottom edge while the clock is in the gap before the next session.
 *
 * Returns null outside the teaching day, where a marker would be meaningless.
 */
export function getNowPosition(
  sessions: SessionConfig[],
  nowMinutes: number,
): NowPosition | null {
  const ranges = getSessionRanges(sessions);
  if (ranges.length === 0) return null;

  const first = ranges[0]!;
  const last = ranges[ranges.length - 1]!;

  if (nowMinutes < first.startMinutes || nowMinutes > last.endMinutes) return null;

  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]!;
    if (nowMinutes > range.endMinutes) continue;

    if (nowMinutes >= range.startMinutes) {
      const span = range.endMinutes - range.startMinutes;
      const fraction = span > 0 ? (nowMinutes - range.startMinutes) / span : 0;

      return { sessionNumber: range.sessionNumber, fraction, inSession: true };
    }

    // In the gap before this session: sit on the previous row's bottom edge.
    const previous = ranges[i - 1];
    if (!previous) return null;

    return { sessionNumber: previous.sessionNumber, fraction: 1, inSession: false };
  }

  return null;
}

/** The session currently running, or null between sessions. */
export function getLiveSessionNumber(
  sessions: SessionConfig[],
  nowMinutes: number,
): SessionNumber | null {
  for (const range of getSessionRanges(sessions)) {
    if (nowMinutes >= range.startMinutes && nowMinutes <= range.endMinutes) {
      return range.sessionNumber;
    }
  }

  return null;
}
