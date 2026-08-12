import { z } from 'zod';

export const positiveIntegerIdSchema = z.coerce
  .number()
  .int('ID must be a whole number')
  .positive('ID must be positive');

export const userIdSchema = positiveIntegerIdSchema;

export function nonEmptyTrimmedString(message: string) {
  return z.string().trim().min(1, message);
}

export function nonBlankString(message: string) {
  return z.string().refine((value) => value.trim().length > 0, { message });
}
