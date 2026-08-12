import type { ApiAdminUserPayload } from '~~/types/api';
import { apiError, success } from '~~/server/utils/apiResponse';

export default defineEventHandler(async () => {
  try {
    const db = useDB();
    const users = await db.select().from(tables.users).execute();
    const response: ApiAdminUserPayload[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));

    return success(response);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to load users',
      code: 'USERS_LOAD_FAILED',
      cause,
    });
  }
});
