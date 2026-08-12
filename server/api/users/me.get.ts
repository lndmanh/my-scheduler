import type { ApiAdminUserPayload } from '~~/types/api';
import { apiError, success } from '~~/server/utils/apiResponse';
import { getUserById } from '~~/server/utils/database/user';

type CurrentUser = Awaited<ReturnType<typeof getUserById>>;

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user) {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Authentication is required',
      code: 'UNAUTHORIZED',
    });
  }

  let user: CurrentUser;
  try {
    user = await getUserById(session.user.id);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to load the current user',
      code: 'CURRENT_USER_LOAD_FAILED',
      cause,
    });
  }

  if (!user) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Current user was not found',
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
