import { z } from 'zod';
import { nonBlankString, nonEmptyTrimmedString } from '#shared/schemas/common';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username too long')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores',
  );

export const emailSchema = z.email('Valid email is required');

export const passwordComplexitySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerPasswordRequestSchema = z.object({
  username: usernameSchema,
  password: passwordComplexitySchema,
});

export const registrationPasswordFormSchema = registerPasswordRequestSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginPasswordRequestSchema = z.object({
  username: nonEmptyTrimmedString('Username is required'),
  password: nonBlankString('Password is required'),
});

export const passkeyRegistrationSchema = z.object({
  username: nonEmptyTrimmedString('Username is required'),
});

export type RegisterPasswordRequest = z.infer<typeof registerPasswordRequestSchema>;
export type RegistrationPasswordFormData = z.infer<typeof registrationPasswordFormSchema>;
export type LoginPasswordRequest = z.infer<typeof loginPasswordRequestSchema>;
