import { defineStore } from 'pinia';
import { apiRoutes } from '#shared/apiRoutes';
import type { ApiDeletedPayload, ApiResponse } from '~~/types/api';
import type {
  Schedule,
  SessionConfig,
  Course,
  CourseFormData,
  Day,
  SessionNumber,
  GridCell,
  ScheduleWithRelations,
} from '~~/types/scheduler';
import { DAYS, SESSIONS } from '~~/types/scheduler';
import { apiRequest } from '@/utils/apiRequest';

export const useSchedulerStore = defineStore('scheduler', () => {
  // State
  const scheduleId = ref<string | null>(null);
  const scheduleName = ref('My Schedule');
  const sessionsConfig = ref<SessionConfig[]>([]);
  const courses = ref<Course[]>([]);
  const loading = ref(false);
  const hiddenDays = ref<Set<Day>>(new Set());
  const schedules = ref<Schedule[]>([]);

  // Computed
  const { loggedIn } = useUserSession();
  const readonly = computed(() => !loggedIn.value);

  const visibleDays = computed(() => {
    return DAYS.filter((day) => !hiddenDays.value.has(day));
  });

  const gridData = computed<GridCell[]>(() => {
    const grid: GridCell[] = [];

    for (const day of visibleDays.value) {
      for (const session of SESSIONS) {
        grid.push({
          day,
          session,
          courses: courses.value.filter(
            (course) => course.day === day && course.session === session,
          ),
        });
      }
    }

    return grid;
  });

  const getSessionConfig = computed(() => {
    return (sessionNumber: SessionNumber) =>
      sessionsConfig.value.find((s) => s.sessionNumber === sessionNumber);
  });

  // Actions
  async function createSchedule() {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<ScheduleWithRelations>>(apiRoutes.schedules.index, {
        method: 'POST',
      });

      if (!response.success) {
        throw response;
      }

      const data = response.data;

      scheduleId.value = data.id;
      scheduleName.value = data.name;

      // Load the full schedule data
      await loadSchedule(data.id);

      return data.id;
    } finally {
      loading.value = false;
    }
  }

  async function loadSchedule(id: string) {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<ScheduleWithRelations>>(apiRoutes.schedules.byId(id));

      if (!response.success) {
        throw response;
      }

      const data = response.data;

      scheduleId.value = data.id;
      scheduleName.value = data.name;
      sessionsConfig.value = data.sessionsConfig || [];
      courses.value = data.courses || [];
    } finally {
      loading.value = false;
    }
  }

  async function updateSchedule(name?: string, sessions?: SessionConfig[]) {
    if (!scheduleId.value) return;

    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<ScheduleWithRelations>>(
        apiRoutes.schedules.byId(scheduleId.value),
        {
          method: 'PUT',
          body: {
            name,
            sessionsConfig: sessions,
          },
        },
      );

      if (!response.success) {
        throw response;
      }

      const data = response.data;

      if (name) scheduleName.value = name;
      if (sessions) sessionsConfig.value = data.sessionsConfig || [];
    } finally {
      loading.value = false;
    }
  }

  async function addCourse(courseData: CourseFormData) {
    if (!scheduleId.value) return;

    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<Course>>(apiRoutes.courses.index, {
        method: 'POST',
        body: {
          scheduleId: scheduleId.value,
          ...courseData,
        },
      });

      if (!response.success) {
        throw response;
      }

      const newCourse = response.data;

      courses.value.push(newCourse);
      return newCourse;
    } finally {
      loading.value = false;
    }
  }

  async function updateCourse(courseId: number, courseData: Partial<CourseFormData>) {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<Course>>(apiRoutes.courses.byId(courseId), {
        method: 'PUT',
        body: courseData,
      });

      if (!response.success) {
        throw response;
      }

      const updatedCourse = response.data;

      const index = courses.value.findIndex((c) => c.id === courseId);
      if (index !== -1) {
        courses.value[index] = updatedCourse;
      }

      return updatedCourse;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCourse(courseId: number) {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<ApiDeletedPayload>>(apiRoutes.courses.byId(courseId), {
        method: 'DELETE',
      });

      if (!response.success) {
        throw response;
      }

      courses.value = courses.value.filter((c) => c.id !== courseId);
    } finally {
      loading.value = false;
    }
  }

  async function cloneCourse(course: Course) {
    if (!scheduleId.value) return;

    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<Course>>(apiRoutes.courses.index, {
        method: 'POST',
        body: {
          scheduleId: scheduleId.value,
          name: `${course.name} (Copy)`,
          instructor: course.instructor,
          credits: course.credits,
          room: course.room,
          day: course.day,
          session: course.session,
          courseType: course.courseType,
          studyGroup: course.studyGroup,
          code: course.code,
          notes: course.notes,
        },
      });

      if (!response.success) {
        throw response;
      }

      const clonedCourse = response.data;

      courses.value.push(clonedCourse);
      return clonedCourse;
    } finally {
      loading.value = false;
    }
  }

  function getCourseById(courseId: number) {
    return courses.value.find((c) => c.id === courseId);
  }

  function toggleDayVisibility(day: Day) {
    if (hiddenDays.value.has(day)) {
      hiddenDays.value.delete(day);
    } else {
      hiddenDays.value.add(day);
    }
    // Trigger reactivity
    hiddenDays.value = new Set(hiddenDays.value);
  }

  async function importSchedule(data: {
    name: string;
    sessionsConfig: SessionConfig[];
    courses: CourseFormData[];
  }) {
    if (!scheduleId.value) return;

    loading.value = true;
    try {
      // 1. Update schedule info
      await updateSchedule(data.name, data.sessionsConfig);

      // 2. Clear existing courses
      const currentCourses = [...courses.value];
      await Promise.all(currentCourses.map((c) => deleteCourse(c.id)));

      // 3. Add new courses
      // We map the imported courses to the required format, ignoring old IDs
      await Promise.all(
        data.courses.map((c) =>
          addCourse({
            name: c.name,
            instructor: c.instructor,
            credits: c.credits,
            room: c.room,
            day: c.day,
            session: c.session,
            courseType: c.courseType,
            studyGroup: c.studyGroup,
            code: c.code,
            notes: c.notes,
          }),
        ),
      );
    } finally {
      loading.value = false;
    }
  }

  async function fetchSchedules() {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<Schedule[]>>(apiRoutes.schedules.index);

      if (!response.success) {
        throw response;
      }

      const data = response.data;
      schedules.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSchedule(id: string) {
    loading.value = true;
    try {
      const response = await apiRequest<ApiResponse<ApiDeletedPayload>>(apiRoutes.schedules.byId(id), {
        method: 'DELETE',
      });

      if (!response.success) {
        throw response;
      }

      schedules.value = schedules.value.filter((s) => s.id !== id);
      if (scheduleId.value === id) {
        scheduleId.value = null;
        scheduleName.value = 'My Schedule';
        courses.value = [];
        sessionsConfig.value = [];
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    scheduleId,
    scheduleName,
    sessionsConfig,
    courses,
    loading,
    hiddenDays,

    // Computed
    gridData,
    getSessionConfig,
    visibleDays,
    readonly,

    // Actions
    createSchedule,
    loadSchedule,
    updateSchedule,
    addCourse,
    updateCourse,
    deleteCourse,
    cloneCourse,
    getCourseById,
    toggleDayVisibility,
    importSchedule,
    fetchSchedules,
    deleteSchedule,
    schedules,
  };
});
