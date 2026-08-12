<script setup lang="ts">
import { useSchedulerStore } from '@/stores/scheduler';
import type { Course, CourseFormData, Day, SessionConfig, SessionNumber } from '~~/types/scheduler';
import CourseSheet from '@/components/scheduler/CourseSheet.vue';
import SchedulerGrid from '@/components/scheduler/SchedulerGrid.vue';
import SchedulerGridSkeleton from '@/components/scheduler/SchedulerGridSkeleton.vue';
import SchedulerDock from '@/components/scheduler/SchedulerDock.vue';
import { TriangleAlert } from '@lucide/vue';
import { saveAs } from 'file-saver';
import { toast } from 'vue-sonner';
import { generateICS } from '@/utils/ics-export';

definePageMeta({
  layout: 'dashboard',
});

useSeoMeta({
  title: 'Thời khóa biểu',
  description: 'Tạo và quản lý thời khóa biểu của bạn',
});

const schedulerStore = useSchedulerStore();
const route = useRoute();
const fileInput = ref<HTMLInputElement | null>(null);

// Course sheet state
const isCourseSheetOpen = ref(false);
const isShareDialogOpen = ref(false);
const selectedCourse = ref<Course | null>(null);
const defaultDay = ref<Day | undefined>();
const defaultSession = ref<SessionNumber | undefined>();
const copiedCourseCodes = shallowRef(false);
const activeCourseId = computed(() =>
  isCourseSheetOpen.value ? (selectedCourse.value?.id ?? null) : null,
);

// Page-level state: loading -> (error | loaded)
const initializing = ref(true);
const loadError = ref<string | null>(null);

const scheduleId = computed(() => route.params.id?.toString() ?? '');

async function initialize() {
  initializing.value = true;
  loadError.value = null;

  try {
    await schedulerStore.loadSchedule(scheduleId.value);
  } catch (error) {
    console.error('Failed to initialize schedule:', error);
    loadError.value =
      'Thời khóa biểu này không tồn tại hoặc bạn không có quyền xem. Kiểm tra lại đường dẫn rồi thử lại.';
  } finally {
    initializing.value = false;
  }
}

onMounted(initialize);

// Surface the schedule's own name in the breadcrumb instead of the static page
// title, so the dock does not have to carry orientation on mobile.
usePageBreadcrumbs(() =>
  initializing.value || loadError.value
    ? undefined
    : [
        { title: 'Trang chủ', href: '/' },
        { title: schedulerStore.scheduleName, href: route.path },
      ],
);

// Handlers
async function handleRename(name: string) {
  try {
    await schedulerStore.updateSchedule(name);
  } catch (error) {
    console.error('Failed to update schedule name:', error);
    toast.error('Không đổi được tên thời khóa biểu. Thử lại sau.');
  }
}

function handleAddCourse() {
  selectedCourse.value = null;
  defaultDay.value = undefined;
  defaultSession.value = undefined;
  isCourseSheetOpen.value = true;
}

function handleCourseClick(course: Course) {
  selectedCourse.value = course;
  isCourseSheetOpen.value = true;
}

function handleCellClick(day: Day, session: SessionNumber) {
  selectedCourse.value = null;
  defaultDay.value = day;
  defaultSession.value = session;
  isCourseSheetOpen.value = true;
}

async function handleCourseSubmit(data: CourseFormData) {
  try {
    if (selectedCourse.value) {
      await schedulerStore.updateCourse(selectedCourse.value.id, data);
      toast.success('Đã cập nhật môn học.');
    } else {
      await schedulerStore.addCourse(data);
      toast.success('Đã thêm môn học.');
    }
    isCourseSheetOpen.value = false;
  } catch (error) {
    console.error('Failed to save course:', error);
    toast.error('Không lưu được môn học. Thử lại sau.');
  }
}

async function handleCourseDelete(courseId: number) {
  try {
    await schedulerStore.deleteCourse(courseId);
    isCourseSheetOpen.value = false;
    toast.success('Đã xóa môn học.');
  } catch (error) {
    console.error('Failed to delete course:', error);
    toast.error('Không xóa được môn học. Thử lại sau.');
  }
}

async function handleCloneCourse(course: Course) {
  try {
    await schedulerStore.cloneCourse(course);
    toast.success('Đã nhân bản môn học.');
  } catch (error) {
    console.error('Failed to clone course:', error);
    toast.error('Không nhân bản được môn học. Thử lại sau.');
  }
}

async function handleMoveCourse(courseId: number, day: Day, session: SessionNumber) {
  try {
    await schedulerStore.updateCourse(courseId, { day, session });
  } catch (error) {
    console.error('Failed to move course:', error);
    toast.error('Không di chuyển được môn học. Thử lại sau.');
  }
}

async function handleSessionUpdate(sessions: SessionConfig[]) {
  try {
    await schedulerStore.updateSchedule(undefined, sessions);
    toast.success('Đã lưu cấu hình ca học.');
  } catch (error) {
    console.error('Failed to update sessions:', error);
    toast.error('Không lưu được cấu hình ca học. Thử lại sau.');
  }
}

const shareUrl = computed(() => {
  if (import.meta.client && schedulerStore.scheduleId) {
    return `${window.location.origin}/scheduler/${schedulerStore.scheduleId}`;
  }
  return '';
});

function handleExport() {
  const data = {
    name: schedulerStore.scheduleName,
    sessionsConfig: schedulerStore.sessionsConfig,
    courses: schedulerStore.courses,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `scheduler-${schedulerStore.scheduleId}.json`);
  toast.success('Đã xuất file thời khóa biểu.');
}

function handleExportCalendar() {
  const icsContent = generateICS(
    schedulerStore.courses,
    schedulerStore.sessionsConfig,
    schedulerStore.scheduleName,
  );

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, `${schedulerStore.scheduleName || 'schedule'}.ics`);
  toast.success('Đã xuất file lịch.');
}

const courseCodesText = computed(() => {
  const codes = new Set<string>();

  for (const course of schedulerStore.courses) {
    const code = course.code?.replace(/[\r\n]+/g, '').trim();
    if (code) codes.add(code);
  }

  return Array.from(codes).join('\n');
});

async function handleCopyCourseCodes() {
  if (!courseCodesText.value) return;

  try {
    await navigator.clipboard.writeText(courseCodesText.value);
    copiedCourseCodes.value = true;
    setTimeout(() => {
      copiedCourseCodes.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy course codes:', error);
    toast.error('Không sao chép được mã học phần. Thử lại sau.');
  }
}

function handleImport() {
  fileInput.value?.click();
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const content = e.target?.result as string;
      const data = JSON.parse(content);
      await schedulerStore.importSchedule(data);
      toast.success('Đã nhập thời khóa biểu.');
    } catch (error) {
      console.error('Failed to import schedule:', error);
      toast.error('Không đọc được file. Kiểm tra lại định dạng rồi thử lại.');
    } finally {
      // Reset so the same file can be picked again.
      input.value = '';
    }
  };

  reader.readAsText(file);
}

// Stats. Counted per unique course code so a subject split across several
// sessions is not counted (or charged credits) more than once.
const uniqueCourses = computed(() => {
  const coursesMap = new Map<string, Course>();

  schedulerStore.courses.forEach((course) => {
    const key = course.code || `unnamed-${course.id}`;
    if (!coursesMap.has(key)) {
      coursesMap.set(key, course);
    }
  });

  return Array.from(coursesMap.values());
});

const totalUniqueCourses = computed(() => uniqueCourses.value.length);

const totalUniqueCredits = computed(() =>
  uniqueCourses.value.reduce((sum, course) => sum + course.credits, 0),
);

const totalInstructors = computed(
  () =>
    new Set(
      schedulerStore.courses
        .map((c) => c.instructor?.trim())
        .filter((name): name is string => Boolean(name)),
    ).size,
);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Loading -->
    <SchedulerGridSkeleton v-if="initializing" />

    <!-- Load failure. Nothing loaded means nothing to interact with, so the
         grid and dock stay out of the way entirely. -->
    <Empty v-else-if="loadError" class="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Không tải được thời khóa biểu</EmptyTitle>
        <EmptyDescription>{{ loadError }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div class="flex flex-wrap justify-center gap-2">
          <Button :disabled="schedulerStore.loading" @click="initialize">Thử lại</Button>
          <Button variant="outline" @click="navigateTo('/')">Về trang chủ</Button>
        </div>
      </EmptyContent>
    </Empty>

    <!-- Loaded. A schedule with no courses still renders the grid: every empty
         cell is the affordance for adding the first one. -->
    <template v-else>
      <input ref="fileInput" type="file" class="hidden" accept=".json" @change="onFileSelected" />

      <!-- The grid scrolls internally and carries its own dock clearance. -->
      <SchedulerGrid
        :grid-data="schedulerStore.gridData"
        :sessions-config="schedulerStore.sessionsConfig"
        :visible-days="schedulerStore.visibleDays"
        :active-course-id="activeCourseId"
        :readonly="schedulerStore.readonly"
        @course-click="handleCourseClick"
        @cell-click="handleCellClick"
        @clone-course="handleCloneCourse"
        @move-course="handleMoveCourse"
      />

      <SchedulerDock
        :schedule-name="schedulerStore.scheduleName"
        :readonly="schedulerStore.readonly"
        :can-share="Boolean(schedulerStore.scheduleId)"
        :total-courses="totalUniqueCourses"
        :total-credits="totalUniqueCredits"
        :total-instructors="totalInstructors"
        :has-course-codes="Boolean(courseCodesText)"
        :copied-course-codes="copiedCourseCodes"
        :hidden-days="schedulerStore.hiddenDays"
        :sessions-config="schedulerStore.sessionsConfig"
        @rename="handleRename"
        @add-course="handleAddCourse"
        @toggle-day="schedulerStore.toggleDayVisibility"
        @update-sessions="handleSessionUpdate"
        @import="handleImport"
        @export="handleExport"
        @export-calendar="handleExportCalendar"
        @copy-course-codes="handleCopyCourseCodes"
        @share="isShareDialogOpen = true"
      />

      <ClientOnly>
        <SchedulerShareDialog v-model:open="isShareDialogOpen" :url="shareUrl" />
      </ClientOnly>

      <CourseSheet
        v-model:open="isCourseSheetOpen"
        :course="selectedCourse"
        :default-day="defaultDay"
        :default-session="defaultSession"
        :submitting="schedulerStore.loading"
        @submit="handleCourseSubmit"
        @delete="handleCourseDelete"
      />
    </template>
  </div>
</template>
