import { deleteUser } from '~~/server/utils/database/user';
import { userIdSchema } from '#shared/schemas/common';
import type { ApiDeletedPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

export default defineEventHandler(async (event) => {
  const parsedUserId = userIdSchema.safeParse(getRouterParam(event, 'id'));

  if (!parsedUserId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Invalid user ID',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedUserId.error),
    });
  }

  const userId = parsedUserId.data;

  try {
    await deleteUser(userId);

    const response: ApiDeletedPayload = { deleted: true };
    return success(response);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to delete user',
      code: 'USER_DELETE_FAILED',
      cause,
    });
  }
});
