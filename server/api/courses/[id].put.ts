import { positiveIntegerIdSchema } from '#shared/schemas/common';
import { updateCourseRequestSchema } from '#shared/schemas/schedulerSchema';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';

type CoursePayload = NonNullable<Awaited<ReturnType<typeof updateCourse>>>;
type UpdatedCourse = Awaited<ReturnType<typeof updateCourse>>;

export default defineEventHandler(async (event) => {
  const parsedId = positiveIntegerIdSchema.safeParse(getRouterParam(event, 'id'));

  if (!parsedId.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Course ID is required',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(parsedId.error),
    });
  }

  const body = await readBody(event);
  const validation = updateCourseRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please correct the course details',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  let updatedCourse: UpdatedCourse;
  try {
    updatedCourse = await updateCourse(parsedId.data, validation.data);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to update course',
      code: 'COURSE_UPDATE_FAILED',
      cause,
    });
  }

  if (!updatedCourse) {
    throw apiError({
      status: 404,
      statusText: 'Not Found',
      message: 'Course not found',
      code: 'COURSE_NOT_FOUND',
    });
  }

  const response: CoursePayload = updatedCourse;
  return success(response);
});
