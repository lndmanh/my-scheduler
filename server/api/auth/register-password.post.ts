import { registerPasswordRequestSchema } from '#shared/schemas/authSchema';
import type { ApiRegistrationPayload } from '~~/types/api';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';
import { createUser, getUserByUsername } from '~~/server/utils/database/user';

type ExistingUser = Awaited<ReturnType<typeof getUserByUsername>>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validation = registerPasswordRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please correct the registration details',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const { username, password } = validation.data;

  let existingUser: ExistingUser;
  try {
    existingUser = await getUserByUsername(username);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Unable to register an account',
      code: 'REGISTRATION_FAILED',
      cause,
    });
  }

  if (existingUser) {
    throw apiError({
      status: 409,
      statusText: 'Conflict',
      message: 'Username already exists',
      code: 'USERNAME_EXISTS',
    });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({
      username: username.toLowerCase().trim(),
      name: username.trim(),
      password: hashedPassword,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });

    await setUserSession(event, {
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
      },
    });

    const response: ApiRegistrationPayload = {
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
      },
    };

    return success(
      response,
      'Account created successfully. You can now create a passkey for additional security.',
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes('UNIQUE constraint failed')) {
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
      message: 'Unable to register an account',
      code: 'REGISTRATION_FAILED',
      cause,
    });
  }
});
