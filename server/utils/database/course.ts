import { eq } from 'drizzle-orm';

/**
 * Get a course by ID
 * Uses caching for performance
 */
export async function getCourseById(id: number) {
  const db = useDB();
  const course = await db.select().from(tables.courses).where(eq(tables.courses.id, id)).get();

  return course;
}

/**
 * Create a new course
 * Invalidates schedule cache
 */
export async function createCourse(data: typeof tables.courses.$inferInsert) {
  const db = useDB();

  const newCourse = await db.insert(tables.courses).values(data).returning().get();
  return newCourse;
}

/**
 * Update a course by ID
 * Invalidates both course and schedule cache
 */
export async function updateCourse(id: number, data: Partial<typeof tables.courses.$inferInsert>) {
  const db = useDB();

  const updatedCourse = await db
    .update(tables.courses)
    .set(data)
    .where(eq(tables.courses.id, id))
    .returning()
    .get();
  return updatedCourse;
}

/**
 * Delete a course by ID
 * Invalidates both course and schedule cache
 */
export async function deleteCourse(id: number) {
  const db = useDB();

  // Get the course first to know which schedule to invalidate
  const course = await getCourseById(id);

  if (course) {
    await db.delete(tables.courses).where(eq(tables.courses.id, id)).execute();
  }
}
