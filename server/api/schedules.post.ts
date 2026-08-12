import { createSchedule } from '../utils/database/schedule';
import { apiError, success } from '~~/server/utils/apiResponse';

type SchedulePayload = NonNullable<Awaited<ReturnType<typeof createSchedule>>>;
type CreatedSchedule = Awaited<ReturnType<typeof createSchedule>>;

export default defineEventHandler(async () => {
  let schedule: CreatedSchedule;
  try {
    schedule = await createSchedule();
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to create schedule',
      code: 'SCHEDULE_CREATE_FAILED',
      cause,
    });
  }

  if (!schedule) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Schedule was created but could not be loaded',
      code: 'SCHEDULE_LOAD_FAILED',
    });
  }

  const response: SchedulePayload = schedule;
  return success(response);
});
