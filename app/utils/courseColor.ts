import type { Course } from '~~/types/scheduler';

/** Number of hues defined as `--course-N-*` in `app/assets/css/tailwind.css`. */
export const COURSE_HUE_COUNT = 8;

export type CourseHue = number;

/**
 * Map a course onto one of the palette hues.
 *
 * Keyed on the course code so every section of the same subject gets the same
 * colour everywhere it appears in the week — that repetition is the whole point,
 * it's what makes the grid scannable. Falls back to the name for courses that
 * have no code yet.
 *
 * With eight hues, a student carrying more than eight distinct subjects will hit
 * a collision. That's accepted: eight is roughly the ceiling for hues that stay
 * distinguishable at card size in both themes, and the code and room text
 * disambiguate the rest.
 */
export function getCourseHue(course: Pick<Course, 'code' | 'name'>): CourseHue {
  const key = (course.code?.trim() || course.name?.trim() || '').toLowerCase();

  if (!key) return 1;

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }

  return (hash % COURSE_HUE_COUNT) + 1;
}

/**
 * CSS custom properties for a course's hue.
 *
 * Returned as a style binding rather than class names so the template can keep
 * static classes like `bg-[var(--course-surface)]` — Tailwind never has to scan
 * a dynamically built class string.
 */
export function getCourseColorVars(course: Pick<Course, 'code' | 'name'>) {
  const hue = getCourseHue(course);

  return {
    '--course-accent': `var(--course-${hue}-accent)`,
    '--course-surface': `var(--course-${hue}-surface)`,
    '--course-border': `var(--course-${hue}-border)`,
  } as Record<string, string>;
}
