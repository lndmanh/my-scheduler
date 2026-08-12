import { positiveIntegerIdSchema } from '#shared/schemas/common';
import type { ApiDeletedPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

export default defineEventHandler(async (event) => {
  const parsedId = positiveIntegerIdSchema.safeParse(getRouterParam(event, 'id'));

  if (!parsedId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Course ID is required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedId.error),
    });
  }

  try {
    await deleteCourse(parsedId.data);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to delete course',
      code: 'COURSE_DELETE_FAILED',
      cause,
    });
  }

  const response: ApiDeletedPayload = { deleted: true };
  return success(response);
});
