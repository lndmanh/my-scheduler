import { createCourseRequestSchema } from '#shared/schemas/schedulerSchema';
import { apiError, success, zodErrorToFieldErrors } from '~~/server/utils/apiResponse';
import { createCourse } from '../utils/database/course';

type CoursePayload = Awaited<ReturnType<typeof createCourse>>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const validation = createCourseRequestSchema.safeParse(body);

  if (!validation.success) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      message: 'Please correct the course details',
      code: 'VALIDATION_ERROR',
      fieldErrors: zodErrorToFieldErrors(validation.error),
    });
  }

  const validated = validation.data;

  try {
    const course = await createCourse({
      scheduleId: validated.scheduleId,
      name: validated.name,
      instructor: validated.instructor,
      credits: validated.credits,
      room: validated.room,
      day: validated.day,
      session: validated.session,
      courseType: validated.courseType,
      studyGroup: validated.studyGroup,
      code: validated.code,
      notes: validated.notes,
      createdAt: new Date(),
    });

    const response: CoursePayload = course;
    return success(response);
  } catch (cause) {
    throw apiError({
      status: 500,
      statusText: 'Internal Server Error',
      message: 'Failed to create course',
      code: 'COURSE_CREATE_FAILED',
      cause,
    });
  }
});
