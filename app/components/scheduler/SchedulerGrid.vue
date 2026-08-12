<script setup lang="ts">
import { useNow } from '@vueuse/core';
import type { GridCell, SessionConfig, Day, SessionNumber, Course } from '~~/types/scheduler';
import { SESSIONS, DAY_LABELS, DAY_SHORT_LABELS, dayFromDate } from '~~/types/scheduler';
import {
  formatMinutes,
  getLiveSessionNumber,
  getNowPosition,
  minutesOfDay,
} from '@/utils/scheduleTime';
import SchedulerCourseCard from './CourseCard.vue';
import { Plus, TriangleAlert } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    gridData: GridCell[];
    sessionsConfig: SessionConfig[];
    visibleDays: Day[];
    activeCourseId?: number | null;
    readonly?: boolean;
  }>(),
  {
    activeCourseId: null,
    readonly: false,
  },
);

const emit = defineEmits<{
  courseClick: [course: Course];
  cellClick: [day: Day, session: SessionNumber];
  cloneCourse: [course: Course];
  moveCourse: [courseId: number, day: Day, session: SessionNumber];
}>();

const dragOverCell = ref<{ day: Day; session: SessionNumber } | null>(null);

/**
 * Roving tabindex: exactly one cell is in the tab order at a time, and arrow
 * keys move the focus within the grid. Without this, reaching the last slot
 * would take 24 tab presses.
 */
const focusedCell = ref<{ dayIndex: number; sessionIndex: number }>({
  dayIndex: 0,
  sessionIndex: 0,
});

/**
 * Whether the grid actually holds focus.
 *
 * `focusedCell` on its own is only the roving tabindex *position*: it defaults
 * to the first cell and is never unset, so it cannot stand in for real focus.
 * Driving card expansion from it alone leaves the first cell's cards stuck open
 * after a hover — `syncExpandedState` keeps resolving to "expanded", and the
 * early return in `setExpanded` means the collapse never runs.
 */
const hasCellFocus = ref(false);

const gridRef = useTemplateRef<HTMLDivElement>('grid');

// Ticks the clock so the marker advances and "today" survives midnight. Thirty
// seconds is well under the ~1px-per-minute the marker actually moves.
const now = useNow({ interval: 30_000 });
const nowMinutes = computed(() => minutesOfDay(now.value));

const today = computed(() => dayFromDate(now.value));

/** Row placement for the marker, or null outside the teaching day. */
const nowPosition = computed(() => getNowPosition(props.sessionsConfig, nowMinutes.value));

const nowRowIndex = computed(() => {
  const position = nowPosition.value;
  if (!position) return -1;

  return SESSIONS.indexOf(position.sessionNumber);
});

const nowLabel = computed(() => formatMinutes(nowMinutes.value));

/** The session running right now, used to flag live courses. */
const liveSessionNumber = computed(() =>
  getLiveSessionNumber(props.sessionsConfig, nowMinutes.value),
);

function isCourseLive(day: Day, session: SessionNumber): boolean {
  return day === today.value && session === liveSessionNumber.value;
}

const gridTemplateColumns = computed(
  () => `minmax(4.75rem, auto) repeat(${props.visibleDays.length}, minmax(9rem, 1fr))`,
);

/**
 * When nothing is visible in the grid, the add affordance rests visible instead
 * of waiting for a hover — a brand new schedule should teach the interaction.
 */
const showAddHints = computed(
  () => !props.readonly && props.gridData.every((cell) => cell.courses.length === 0),
);

function getSessionTime(sessionNumber: SessionNumber) {
  const config = props.sessionsConfig.find((s) => s.sessionNumber === sessionNumber);
  if (!config) return '';

  const parts = config.startTime.split(':');
  const hours = parts[0];
  const minutes = parts[1];

  if (!hours || !minutes) return '';

  const startHour = parseInt(hours);
  const startMin = parseInt(minutes);

  const endMinutes = startMin + config.duration;
  const endHour = startHour + Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;

  return `${config.startTime} - ${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
}

function getCellCourses(day: Day, session: SessionNumber): Course[] {
  return props.gridData.find((cell) => cell.day === day && cell.session === session)?.courses ?? [];
}

function hasCourses(day: Day, session: SessionNumber): boolean {
  return getCellCourses(day, session).length > 0;
}

/** Two courses in one slot means a double booking, not a layout detail. */
function hasConflict(day: Day, session: SessionNumber): boolean {
  return getCellCourses(day, session).length > 1;
}

function cellLabel(day: Day, session: SessionNumber): string {
  const courses = getCellCourses(day, session);
  const slot = `${DAY_LABELS[day]}, Ca ${session}`;

  if (courses.length === 0) return `${slot}, trống`;
  if (courses.length === 1) return `${slot}, ${courses[0]!.name}, phòng ${courses[0]!.room}`;

  return `${slot}, ${courses.length} môn học trùng lịch`;
}

function isCellFocused(dayIndex: number, sessionIndex: number): boolean {
  return focusedCell.value.dayIndex === dayIndex && focusedCell.value.sessionIndex === sessionIndex;
}

/**
 * Focusing a cell expands the cards inside it, so keyboard users get the same
 * detail reveal that pointer users get on hover.
 */
function isCourseExpanded(course: Course, dayIndex: number, sessionIndex: number): boolean {
  return (
    props.activeCourseId === course.id ||
    (hasCellFocus.value && isCellFocused(dayIndex, sessionIndex))
  );
}

function handleCellFocus(dayIndex: number, sessionIndex: number) {
  focusedCell.value = { dayIndex, sessionIndex };
  hasCellFocus.value = true;
}

// Focus moving between cells fires blur before the next focus, so the flag
// settles on `true` within the same task and the grid never flickers.
function handleCellBlur() {
  hasCellFocus.value = false;
}

function focusCell(dayIndex: number, sessionIndex: number) {
  const clampedDay = Math.max(0, Math.min(props.visibleDays.length - 1, dayIndex));
  const clampedSession = Math.max(0, Math.min(SESSIONS.length - 1, sessionIndex));

  focusedCell.value = { dayIndex: clampedDay, sessionIndex: clampedSession };

  void nextTick(() => {
    gridRef.value
      ?.querySelector<HTMLElement>(
        `[data-day-index="${clampedDay}"][data-session-index="${clampedSession}"]`,
      )
      ?.focus();
  });
}

function handleCellKeydown(event: KeyboardEvent, d: number, s: number) {
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      focusCell(d + 1, s);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      focusCell(d - 1, s);
      break;
    case 'ArrowDown':
      event.preventDefault();
      focusCell(d, s + 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusCell(d, s - 1);
      break;
    case 'Home':
      event.preventDefault();
      focusCell(0, s);
      break;
    case 'End':
      event.preventDefault();
      focusCell(props.visibleDays.length - 1, s);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      activateCell(props.visibleDays[d]!, SESSIONS[s]!);
      break;
  }
}

/**
 * Enter on an occupied slot edits the first course there; on an empty slot it
 * opens the add sheet pre-filled with that day and session.
 */
function activateCell(day: Day, session: SessionNumber) {
  if (props.readonly) return;

  const courses = getCellCourses(day, session);
  if (courses.length > 0) {
    emit('courseClick', courses[0]!);
    return;
  }

  emit('cellClick', day, session);
}

function handleCloneCourse(course: Course) {
  emit('cloneCourse', course);
}

function handleDragOver(event: DragEvent, day: Day, session: SessionNumber) {
  if (props.readonly) return;

  event.preventDefault();
  if (!event.dataTransfer) return;

  event.dataTransfer.dropEffect = 'move';
  dragOverCell.value = { day, session };
}

function handleDragLeave() {
  dragOverCell.value = null;
}

function handleDrop(event: DragEvent, day: Day, session: SessionNumber) {
  if (props.readonly) return;

  event.preventDefault();
  event.stopPropagation();

  if (!event.dataTransfer) return;

  const courseId = event.dataTransfer.getData('courseId');
  if (courseId) {
    emit('moveCourse', parseInt(courseId), day, session);
  }

  dragOverCell.value = null;
}

function isDragOver(day: Day, session: SessionNumber): boolean {
  return dragOverCell.value?.day === day && dragOverCell.value?.session === session;
}

// Keep the roving focus in range when days are hidden while the grid is open.
watch(
  () => props.visibleDays.length,
  (length) => {
    if (focusedCell.value.dayIndex > length - 1) {
      focusedCell.value = { ...focusedCell.value, dayIndex: Math.max(0, length - 1) };
    }
  },
);
</script>

<template>
  <!--
    A single scroll container for both axes.
    `overflow-x-auto` alone would not work: when one axis is not `visible`, the
    other computes to `auto` anyway, which makes this a vertical scroll container
    whose height fits its content — so `position: sticky` on the header would
    never have anything to stick against. Constraining the height instead makes
    both the sticky header row and the sticky time column resolve against this
    element, and gives the grid the viewport to itself.
  -->
  <div
    data-course-bounds
    class="max-h-[calc(100dvh-var(--header-height)-env(safe-area-inset-top,0px)-3rem)] overflow-auto rounded-xl border border-border bg-card"
  >
    <!--
      Gapless on purpose: shared hairlines between cells read as one continuous
      calendar surface, and the current-time line can run across the row without
      being chopped up by gutters. Edge borders are omitted on the last column
      and last row so they do not double up with the container's own border.
    -->
    <div
      ref="grid"
      role="grid"
      aria-label="Thời khóa biểu theo tuần"
      class="grid pb-28 md:pb-32"
      :style="{ gridTemplateColumns }"
    >
      <!-- Header row -->
      <div role="row" class="contents">
        <div
          role="columnheader"
          :style="{ gridRow: 1, gridColumn: 1 }"
          class="sticky top-0 left-0 z-6 flex items-center justify-center border-r border-b border-border bg-card p-2 text-xs font-semibold text-muted-foreground"
        >
          Thời gian
        </div>
        <div
          v-for="(day, dayIndex) in visibleDays"
          :key="day"
          role="columnheader"
          :aria-current="day === today ? 'date' : undefined"
          :style="{ gridRow: 1, gridColumn: dayIndex + 2 }"
          class="sticky top-0 z-5 flex items-center justify-center gap-2 border-b border-border p-2 text-sm font-semibold"
          :class="[
            dayIndex === visibleDays.length - 1 ? '' : 'border-r',
            day === today ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
          ]"
        >
          <span class="hidden sm:inline">{{ DAY_LABELS[day] }}</span>
          <span class="sm:hidden">{{ DAY_SHORT_LABELS[day] }}</span>
          <span
            v-if="day === today"
            class="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[0.625rem] font-medium"
          >
            Hôm nay
          </span>
        </div>
      </div>

      <!-- Session rows -->
      <template v-for="(session, sessionIndex) in SESSIONS" :key="session">
        <div role="row" class="contents">
          <!-- Time column -->
          <div
            role="rowheader"
            :style="{ gridRow: sessionIndex + 2, gridColumn: 1 }"
            class="sticky left-0 z-4 flex flex-col justify-center border-r border-border bg-muted px-3 py-2"
            :class="sessionIndex === SESSIONS.length - 1 ? '' : 'border-b'"
          >
            <div class="text-sm font-semibold tabular-nums">Ca {{ session }}</div>
            <div class="text-xs text-muted-foreground tabular-nums">
              {{ getSessionTime(session) }}
            </div>
          </div>

          <!-- Day cells -->
          <div
            v-for="(day, dayIndex) in visibleDays"
            :key="`${day}-${session}`"
            role="gridcell"
            :tabindex="isCellFocused(dayIndex, sessionIndex) ? 0 : -1"
            :data-day-index="dayIndex"
            :data-session-index="sessionIndex"
            :aria-label="cellLabel(day, session)"
            :aria-readonly="readonly || undefined"
            :style="{ gridRow: sessionIndex + 2, gridColumn: dayIndex + 2 }"
            class="relative min-h-30 border-border p-1.5 transition-colors focus-visible:z-7 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            :class="[
              dayIndex === visibleDays.length - 1 ? '' : 'border-r',
              sessionIndex === SESSIONS.length - 1 ? '' : 'border-b',
              day === today ? 'bg-primary/4' : 'bg-background',
              isDragOver(day, session) && 'bg-primary/15 outline-2 -outline-offset-2 outline-primary',
              hasConflict(day, session) &&
                'bg-warning/10 outline-2 -outline-offset-2 outline-warning',
              !readonly && 'cursor-pointer',
              !readonly && !hasCourses(day, session) && 'hover:bg-accent/40',
            ]"
            @click="activateCell(day, session)"
            @focus="handleCellFocus(dayIndex, sessionIndex)"
            @blur="handleCellBlur"
            @keydown="handleCellKeydown($event, dayIndex, sessionIndex)"
            @dragover="handleDragOver($event, day, session)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, day, session)"
          >
            <!-- Conflict marker -->
            <div
              v-if="hasConflict(day, session)"
              class="absolute -top-2 -right-2 z-7 flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground shadow-sm"
              :title="`${getCellCourses(day, session).length} môn học trùng lịch`"
            >
              <TriangleAlert class="size-3" />
              {{ getCellCourses(day, session).length }}
            </div>

            <div class="flex h-full flex-col gap-1.5">
              <div v-for="course in getCellCourses(day, session)" :key="course.id" class="relative">
                <SchedulerCourseCard
                  :course="course"
                  :force-expanded="isCourseExpanded(course, dayIndex, sessionIndex)"
                  :readonly="readonly"
                  :live="isCourseLive(day, session)"
                  :tabindex="-1"
                  @click="emit('courseClick', course)"
                  @clone="handleCloneCourse"
                />
              </div>

              <div
                v-if="!hasCourses(day, session) && !readonly"
                class="flex h-full items-center justify-center transition-opacity"
                :class="showAddHints ? 'opacity-40' : 'opacity-0 hover:opacity-100'"
              >
                <Plus class="size-6 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!--
        Current-time marker. Placed as a grid item on the running session's row
        and spanning the day columns, so it needs no measurement of the DOM and
        stays correct as columns are hidden or the grid scrolls. It sits under
        the sticky time column (z-4) so it slides out of sight on horizontal
        scroll, and under an expanded card (z-8).

        Every cell above is placed explicitly for this to work: grid resolves
        explicitly-positioned items before auto-placed ones, so a marker sitting
        on an auto-placed row would push that row's cells down instead of
        overlaying them.
      -->
      <div
        v-if="nowPosition && nowRowIndex >= 0"
        class="pointer-events-none relative z-3"
        :style="{ gridColumn: '2 / -1', gridRow: nowRowIndex + 2 }"
        aria-hidden="true"
      >
        <div
          class="absolute inset-x-0 flex -translate-y-1/2 items-center gap-1"
          :class="nowPosition.inSession ? '' : 'opacity-55'"
          :style="{ top: `${nowPosition.fraction * 100}%` }"
        >
          <span
            class="rounded-full bg-(--now) px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold text-(--now-foreground) tabular-nums shadow-sm"
          >
            {{ nowLabel }}
          </span>
          <span class="h-0.5 flex-1 rounded-full bg-(--now)" />
        </div>
      </div>
    </div>
  </div>
</template>
