import { scheduleIdSchema, updateScheduleRequestSchema } from '#shared/schemas/schedulerSchema';
import {
  updateSchedule,
  updateSessionConfig,
  getScheduleById,
} from '~~/server/utils/database/schedule';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

type SchedulePayload = NonNullable<Awaited<ReturnType<typeof getScheduleById>>>;
type LoadedSchedule = Awaited<ReturnType<typeof getScheduleById>>;

export default defineEventHandler(async (event) => {
  const parsedId = scheduleIdSchema.safeParse(getRouterParam(event, 'id'));

  if (!parsedId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Schedule ID is required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedId.error),
    });
  }

  const body = await readBody(event);
  const validation = updateScheduleRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please correct the schedule details',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const validated = validation.data;
  const id = parsedId.data;

  let schedule: LoadedSchedule;
  try {
    if (validated.name) {
      await updateSchedule(id, { name: validated.name });
    }

    if (validated.sessionsConfig) {
      for (const session of validated.sessionsConfig) {
        await updateSessionConfig(id, session.sessionNumber, {
          startTime: session.startTime,
          duration: session.duration,
        });
      }
    }

    schedule = await getScheduleById(id);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to update schedule',
      code: 'SCHEDULE_UPDATE_FAILED',
      cause,
    });
  }

  if (!schedule) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Schedule not found',
      code: 'SCHEDULE_NOT_FOUND',
    });
  }

  const response: SchedulePayload = schedule;
  return success(response);
});
