import { deleteSchedule } from '../../utils/database/schedule';
import { scheduleIdSchema } from '#shared/schemas/schedulerSchema';
import type { ApiDeletedPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

export default defineEventHandler(async (event) => {
  const parsedId = scheduleIdSchema.safeParse(getRouterParam(event, 'id'));
  if (!parsedId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Missing schedule ID',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedId.error),
    });
  }
  const id = parsedId.data;

  try {
    await deleteSchedule(id);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to delete schedule',
      code: 'SCHEDULE_DELETE_FAILED',
      cause,
    });
  }

  const response: ApiDeletedPayload = { deleted: true };
  return success(response);
});
