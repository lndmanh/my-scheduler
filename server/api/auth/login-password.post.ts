import { loginPasswordRequestSchema } from '#shared/schemas/authSchema';
import type { ApiAuthenticationPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';
import { getUserByUsername } from '~~/server/utils/database/user';

type AuthenticatedUser = Awaited<ReturnType<typeof getUserByUsername>>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validation = loginPasswordRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'A username and password are required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const { username, password } = validation.data;

  let user: AuthenticatedUser;
  try {
    user = await getUserByUsername(username);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Unable to authenticate with the supplied credentials',
      code: 'AUTHENTICATION_FAILED',
      cause,
    });
  }

  if (!user) {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Invalid username or password',
      code: 'INVALID_CREDENTIALS',
    });
  }

  let isValidPassword: boolean;
  try {
    isValidPassword = await verifyPassword(user.password, password);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Unable to authenticate with the supplied credentials',
      code: 'AUTHENTICATION_FAILED',
      cause,
    });
  }

  if (!isValidPassword) {
    throw apiError({
      status: 401,
      statusText: 'Unauthorized',
      message: 'Invalid username or password',
      code: 'INVALID_CREDENTIALS',
    });
  }

  try {
    await updateUser(user.id, { lastLoginAt: new Date() });
    await setUserSession(event, {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
      },
    });
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Unable to complete sign in',
      code: 'AUTHENTICATION_FAILED',
      cause,
    });
  }

  const response: ApiAuthenticationPayload = { authenticated: true };
  return success(response);
});
