import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import type { WebAuthnCredential } from '#auth-utils';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  password: text('password').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }).notNull(),
});

export const credentials = sqliteTable(
  'credentials',
  {
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    id: text('id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull(),
    backedUp: integer('backed_up', { mode: 'boolean' }).notNull(),
    transports: text('transports', { mode: 'json' })
      .notNull()
      .$type<WebAuthnCredential['transports']>(),
  },
  (table) => ({
    pk: unique().on(table.userId, table.id),
  }),
);

/**
 * Relations (useful for queries)
 */
export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}));

/**
 * Course Scheduler Tables
 */
export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('My Schedule'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const sessionsConfig = sqliteTable(
  'sessions_config',
  {
    id: integer('id').primaryKey(),
    scheduleId: text('schedule_id')
      .references(() => schedules.id, { onDelete: 'cascade' })
      .notNull(),
    sessionNumber: integer('session_number').notNull(), // 1-4
    startTime: text('start_time').notNull(), // Format: "HH:MM"
    duration: integer('duration').notNull(), // Duration in minutes
  },
  (table) => ({
    unique: unique().on(table.scheduleId, table.sessionNumber),
  }),
);

export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey(),
  scheduleId: text('schedule_id')
    .references(() => schedules.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  instructor: text('instructor').notNull(),
  credits: integer('credits').notNull(),
  room: text('room').notNull(),
  day: text('day').notNull(), // Mon, Tue, Wed, Thu, Fri, Sat
  session: integer('session').notNull(), // 1-4
  courseType: text('course_type').notNull().default('theory'), // 'theory' or 'practical'
  studyGroup: text('study_group'), // Study group identifier (optional)
  code: text('code'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Scheduler Relations
 */
export const schedulesRelations = relations(schedules, ({ many }) => ({
  sessionsConfig: many(sessionsConfig),
  courses: many(courses),
}));

export const sessionsConfigRelations = relations(sessionsConfig, ({ one }) => ({
  schedule: one(schedules, {
    fields: [sessionsConfig.scheduleId],
    references: [schedules.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one }) => ({
  schedule: one(schedules, {
    fields: [courses.scheduleId],
    references: [schedules.id],
  }),
}));
