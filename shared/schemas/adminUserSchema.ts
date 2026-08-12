import { z } from 'zod';
import { nonBlankString, nonEmptyTrimmedString, userIdSchema } from '#shared/schemas/common';

export const adminUserNameSchema = nonEmptyTrimmedString('Name is required');
export const adminUserPasswordSchema = nonBlankString('Password is required');

export const createAdminUserRequestSchema = z.object({
  username: nonEmptyTrimmedString('Username is required'),
  name: adminUserNameSchema,
  password: adminUserPasswordSchema,
  isAdmin: z.boolean().default(false),
});

export const updateAdminUserRequestSchema = z.object({
  name: adminUserNameSchema.optional(),
  isAdmin: z.boolean().optional(),
});

export const deleteAdminUsersRequestSchema = z.object({
  userIds: z.array(userIdSchema).min(1, 'User IDs array is required'),
});

export type CreateAdminUserRequest = z.infer<typeof createAdminUserRequestSchema>;
export type UpdateAdminUserRequest = z.infer<typeof updateAdminUserRequestSchema>;
export type DeleteAdminUsersRequest = z.infer<typeof deleteAdminUsersRequestSchema>;
