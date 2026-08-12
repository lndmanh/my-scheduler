import type { ApiHealthPayload } from '~~/types/api';
import { success } from '~~/server/utils/apiResponse';

export default defineEventHandler(async () => {
  const response: ApiHealthPayload = {
    status: 'ok',
    timestamp: Date.now(),
  };

  return success(response);
});
