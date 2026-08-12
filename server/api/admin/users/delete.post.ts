import { deleteAdminUsersRequestSchema } from '#shared/schemas/adminUserSchema';
import type { ApiBatchDeletePayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';
import { deleteUsers } from '~~/server/utils/database/user';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validation = deleteAdminUsersRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'User IDs array is required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const { userIds } = validation.data;

  try {
    await deleteUsers(userIds);

    const response: ApiBatchDeletePayload = {
      deleted: userIds.length,
    };
    return success(response);
  } catch (error) {
    console.error('Error deleting users:', error);

    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to delete users',
      code: 'USERS_DELETE_FAILED',
      cause: error,
    });
  }
});
