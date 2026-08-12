import { getScheduleById } from '~~/server/utils/database/schedule';
import { scheduleIdSchema } from '#shared/schemas/schedulerSchema';
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

  const id = parsedId.data;
  let schedule: LoadedSchedule;
  try {
    schedule = await getScheduleById(id);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to load schedule',
      code: 'SCHEDULE_LOAD_FAILED',
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
