import { getAllSchedules } from '../utils/database/schedule';
import { apiError, success } from '~~/server/utils/apiResponse';

type SchedulesPayload = Awaited<ReturnType<typeof getAllSchedules>>;

export default defineEventHandler(async () => {
  try {
    const schedules = await getAllSchedules();
    const response: SchedulesPayload = schedules;
    return success(response);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to load schedules',
      code: 'SCHEDULES_LOAD_FAILED',
      cause,
    });
  }
});
