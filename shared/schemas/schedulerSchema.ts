import { z } from 'zod';
import { nonEmptyTrimmedString } from '#shared/schemas/common';
import { COURSE_TYPES, DAYS } from '~~/types/scheduler';

export const scheduleIdSchema = nonEmptyTrimmedString('Schedule ID is required');
export const courseNameSchema = nonEmptyTrimmedString('Tên học phần là bắt buộc');
export const courseInstructorSchema = nonEmptyTrimmedString('Giảng viên là bắt buộc');
export const courseCreditsSchema = z.coerce.number().int().min(1).max(10);
export const courseRoomSchema = nonEmptyTrimmedString('Phòng học là bắt buộc');
export const sessionNumberSchema = z.coerce.number().int().min(1).max(4);
export const sessionStartTimeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Định dạng giờ không hợp lệ (HH:MM)');
export const sessionDurationSchema = z.coerce.number().int().min(15).max(240);
export const courseTypeSchema = z.enum(COURSE_TYPES);

export const sessionConfigSchema = z.object({
  sessionNumber: sessionNumberSchema,
  startTime: sessionStartTimeSchema,
  duration: sessionDurationSchema,
});

export const courseFormSchema = z.object({
  name: courseNameSchema,
  instructor: courseInstructorSchema,
  credits: courseCreditsSchema,
  room: courseRoomSchema,
  day: z.enum(DAYS),
  session: sessionNumberSchema,
  courseType: courseTypeSchema.default('theory'),
  studyGroup: z.string().optional(),
  code: z.string().optional(),
  notes: z.string().optional(),
});

export const createCourseRequestSchema = courseFormSchema.extend({
  scheduleId: scheduleIdSchema,
});

export const updateCourseRequestSchema = courseFormSchema.partial().extend({
  courseType: courseTypeSchema.default('theory'),
});

export const updateScheduleRequestSchema = z.object({
  name: z.string().optional(),
  sessionsConfig: z.array(sessionConfigSchema).optional(),
});

export type SessionConfigInput = z.infer<typeof sessionConfigSchema>;
export type CourseFormData = z.infer<typeof courseFormSchema>;
export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type UpdateCourseRequest = z.infer<typeof updateCourseRequestSchema>;
export type UpdateScheduleRequest = z.infer<typeof updateScheduleRequestSchema>;
