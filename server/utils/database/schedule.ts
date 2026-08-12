import { eq, and, desc } from 'drizzle-orm';

/**
 * Get a schedule by ID with relations (sessions and courses)
 * Uses caching for performance
 */
export async function getScheduleById(id: string) {
  const db = useDB();

  // Get schedule
  const schedule = await db
    .select()
    .from(tables.schedules)
    .where(eq(tables.schedules.id, id))
    .get();

  if (!schedule) {
    return null;
  }

  // Get sessions config
  const sessionsConfig = await db
    .select()
    .from(tables.sessionsConfig)
    .where(eq(tables.sessionsConfig.scheduleId, id))
    .all();

  // Get courses
  const courses = await db
    .select()
    .from(tables.courses)
    .where(eq(tables.courses.scheduleId, id))
    .all();

  const fullSchedule = {
    ...schedule,
    sessionsConfig,
    courses,
  };
  return fullSchedule;
}

/**
 * Create a new schedule with default session configuration
 */
export async function getAllSchedules() {
  const db = useDB();
  return await db.select().from(tables.schedules).orderBy(desc(tables.schedules.createdAt)).all();
}

export async function createSchedule(name: string = 'My Schedule') {
  const db = useDB();

  // Generate unique ID
  const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date();

  // Create the schedule
  const newSchedule = await db
    .insert(tables.schedules)
    .values({
      id: scheduleId,
      name,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  // Create default session configuration (4 sessions)
  const defaultSessions = [
    { sessionNumber: 1, startTime: '08:00', duration: 90 },
    { sessionNumber: 2, startTime: '10:00', duration: 90 },
    { sessionNumber: 3, startTime: '13:00', duration: 90 },
    { sessionNumber: 4, startTime: '15:00', duration: 90 },
  ];

  await db.insert(tables.sessionsConfig).values(
    defaultSessions.map((session) => ({
      scheduleId,
      sessionNumber: session.sessionNumber,
      startTime: session.startTime,
      duration: session.duration,
    })),
  );

  return await getScheduleById(scheduleId);
}

/**
 * Update schedule metadata (name)
 */
export async function updateSchedule(id: string, data: { name?: string }) {
  const db = useDB();

  await db
    .update(tables.schedules)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tables.schedules.id, id));

  return await getScheduleById(id);
}

/**
 * Update session configuration for a schedule
 */
export async function updateSessionConfig(
  scheduleId: string,
  sessionNumber: number,
  data: { startTime?: string; duration?: number },
) {
  const db = useDB();

  await db
    .update(tables.sessionsConfig)
    .set(data)
    .where(
      and(
        eq(tables.sessionsConfig.scheduleId, scheduleId),
        eq(tables.sessionsConfig.sessionNumber, sessionNumber),
      ),
    );
}

/**
 * Delete a schedule
 * This will cascade delete all sessions and courses
 */
export async function deleteSchedule(id: string) {
  const db = useDB();

  await db.delete(tables.schedules).where(eq(tables.schedules.id, id));
}
