import { updateAdminUserRequestSchema } from '#shared/schemas/adminUserSchema';
import { userIdSchema } from '#shared/schemas/common';
import type { ApiAdminUserPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

type UpdatedUser = Awaited<ReturnType<typeof updateUser>>;

export default defineEventHandler(async (event) => {
  const parsedUserId = userIdSchema.safeParse(getRouterParam(event, 'id'));
  const body = await readBody(event);
  const validation = updateAdminUserRequestSchema.safeParse(body);

  if (!parsedUserId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Invalid user ID',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedUserId.error),
    });
  }

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Invalid user update',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const { name, isAdmin } = validation.data;
  const userId = parsedUserId.data;

  const updateData = {
    ...(name === undefined ? {} : { name }),
    ...(isAdmin === undefined ? {} : { isAdmin }),
  };

  let user: UpdatedUser;
  try {
    user = await updateUser(userId, updateData);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to update user',
      code: 'USER_UPDATE_FAILED',
      cause,
    });
  }

  if (!user) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
  }

  const response: ApiAdminUserPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };

  return success(response);
});
