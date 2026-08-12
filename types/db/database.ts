import type { tables } from '~~/server/utils/db';

export type User = typeof tables.users.$inferSelect;
export type Schedule = typeof tables.schedules.$inferSelect;
export type SessionConfig = typeof tables.sessionsConfig.$inferSelect;
export type Course = typeof tables.courses.$inferSelect;
