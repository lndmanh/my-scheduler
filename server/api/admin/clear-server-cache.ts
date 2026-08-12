import type { ApiCacheClearPayload } from '~~/types/api';
import { apiError, success } from '~~/server/utils/apiResponse';

export default defineEventHandler(async () => {
  try {
    const cache = hubKV();
    await cache.clear();

    const response: ApiCacheClearPayload = { cleared: true };
    return success(response);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to clear the server cache',
      code: 'CACHE_CLEAR_FAILED',
      cause,
    });
  }
});
