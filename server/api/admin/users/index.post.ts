import { createAdminUserRequestSchema } from '#shared/schemas/adminUserSchema';
import type { ApiAdminUserPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';
import { createUser } from '~~/server/utils/database/user';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validation = createAdminUserRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Username, name, and password are required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const { username, name, password, isAdmin } = validation.data;

  try {
    const now = new Date();

    const user = await createUser({
      username: username.toLowerCase(),
      name,
      password: await hashPassword(password),
      isAdmin,
      createdAt: now,
      lastLoginAt: now,
    });

    const response: ApiAdminUserPayload = {
      id: user.id,
      username: user.username,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    return success(response);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw apiError({
        status: 409,
        statusText: 'Conflict',
        message: 'Username already exists',
        code: 'USERNAME_EXISTS',
      });
    }

    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to create user',
      code: 'USER_CREATE_FAILED',
      cause: error,
    });
  }
});
