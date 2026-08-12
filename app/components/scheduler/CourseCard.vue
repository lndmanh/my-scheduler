<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { gsap } from 'gsap';
import { motion } from 'motion-v';
import type { Course } from '~~/types/scheduler';
import { Copy, MapPin, Pencil, User } from '@lucide/vue';
import { cn } from '@/lib/utils';
import { getCourseColorVars } from '@/utils/courseColor';
import CourseCardPixelBackground from './CourseCardPixelBackground.vue';

const props = withDefaults(
  defineProps<{
    course: Course;
    readonly?: boolean;
    forceExpanded?: boolean;
    /** This course's session is running right now. */
    live?: boolean;
    /**
     * Inside the scheduler grid this is -1: the grid cell owns the tab stop and
     * arrow keys move between slots, so the cards must not add 24 extra stops.
     */
    tabindex?: number;
  }>(),
  {
    readonly: false,
    forceExpanded: false,
    live: false,
    tabindex: 0,
  },
);

const emit = defineEmits<{
  click: [course: Course];
  clone: [course: Course];
}>();

const isDragging = shallowRef(false);
const isExpanded = shallowRef(false);
/**
 * Whether the card is lifted above its neighbours.
 *
 * Deliberately not the same as `isExpanded`. An expanded card overflows its
 * cell, and the surrounding cells are `position: relative` with `z-auto`, so a
 * later sibling paints over anything at `z-0`. z-index cannot be tweened, so
 * tying it to `isExpanded` snaps the card underneath the grid on the very first
 * frame of the collapse while it is still full width — the neighbouring cell
 * visibly cuts across it for the rest of the animation. Elevation is therefore
 * held for the whole collapse and released only once it has finished.
 */
const isElevated = shallowRef(false);
const isPointerOver = shallowRef(false);
const isFocused = shallowRef(false);
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const rootRef = useTemplateRef<HTMLDivElement>('root');
const cardRef = useTemplateRef<HTMLDivElement>('card');
const detailsRef = useTemplateRef<HTMLDivElement>('details');

const courseType = computed(() =>
  isMobile.value == false
    ? props.course.courseType === 'theory'
      ? 'Lý thuyết'
      : 'Thực hành'
    : props.course.courseType === 'theory'
      ? 'LT'
      : 'TH',
);
const colorVars = computed(() => getCourseColorVars(props.course));

/**
 * Three ranks, not two.
 *
 * `z-0` — resting, part of the grid.
 * `z-8` — collapsing: still overflowing its cell, so it must stay above the
 *         neighbouring cells until it has shrunk back.
 * `z-9` — expanded: outranks a neighbour that is still collapsing. Flicking
 *         between two cards leaves the old one elevated for the rest of its
 *         animation, and at equal z-index the tie falls to DOM order — which
 *         can put the card actually under the pointer underneath its neighbour.
 *
 * All of them stay below the app header (`z-10`).
 */
const elevationClass = computed(() => {
  if (isExpanded.value) return 'z-9';
  if (isElevated.value) return 'z-8';

  return 'z-0';
});

const cardClasses = computed(() =>
  cn(
    'absolute left-0 top-0 w-full overflow-hidden rounded-xl border transition-shadow duration-300 will-change-transform',
    'border-(--course-border) bg-(--course-surface)',
    elevationClass.value,
    // The shadow can follow `isExpanded` directly — unlike z-index it animates,
    // so it eases out with the collapse instead of snapping.
    isExpanded.value ? 'shadow-float' : 'shadow-card',
    // The now-marker's colour, so a running class reads as part of the same
    // signal rather than a second, unrelated highlight.
    props.live && 'outline-2 -outline-offset-2 outline-(--now)',
    isDragging.value && 'opacity-50',
    props.readonly ? 'cursor-default' : 'cursor-move',
  ),
);

const detailTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.65,
} as const;

const EXPANDED_MAX_WIDTH = 288;
const EDGE_PADDING = 16;

/** The expand/collapse timeline currently running, so it can be cancelled. */
let activeTimeline: gsap.core.Timeline | null = null;

/**
 * The box the expanded card must stay inside.
 *
 * An expanded card floats out of its cell, so it has to be clamped against
 * whatever actually clips it. Inside the scheduler that is the grid's scroll
 * container, not the viewport — the last day column can sit partly past the
 * scroller's right edge, so clamping to `window.innerWidth` lets the card run
 * beyond the scroller and get cut off. Falls back to the viewport when the card
 * is rendered outside a scroller.
 */
function getClampBounds(card: HTMLElement) {
  const container = card.closest<HTMLElement>('[data-course-bounds]');
  if (!container) return { left: 0, right: window.innerWidth };

  const rect = container.getBoundingClientRect();
  return { left: rect.left, right: rect.right };
}

function getExpandedGeometry(card: HTMLElement) {
  const bounds = getClampBounds(card);

  // Measure from the resting position. A rect read mid-tween still carries the
  // previous `x`, which would compound the offset on repeated hovers.
  const currentX = Number(gsap.getProperty(card, 'x')) || 0;
  const restingLeft = card.getBoundingClientRect().left - currentX;

  const available = bounds.right - bounds.left - EDGE_PADDING * 2;
  const width = Math.max(0, Math.min(EXPANDED_MAX_WIDTH, available));

  // Prefer staying put (x = 0); pull left only as far as the right edge demands,
  // and never past the left edge.
  const pullLeft = Math.min(0, bounds.right - EDGE_PADDING - (restingLeft + width));
  const x = Math.max(bounds.left + EDGE_PADDING - restingLeft, pullLeft);

  return { width, x };
}

function animateCard(expanded: boolean) {
  const card = cardRef.value;
  const details = detailsRef.value;
  if (!card || !details) return;

  // `killTweensOf` only kills the child tweens — the parent timeline survives
  // and still fires `onComplete`. A collapse interrupted by a new hover would
  // otherwise drop elevation part-way through the re-expand, putting the card
  // back under the grid at full width.
  activeTimeline?.kill();
  activeTimeline = null;
  gsap.killTweensOf([card, details]);

  const { width: expandedWidth, x: expandedX } = getExpandedGeometry(card);

  if (reducedMotion.value) {
    gsap.set(card, {
      scale: 1,
      width: expanded ? expandedWidth : '100%',
      x: expanded ? expandedX : 0,
      y: 0,
    });
    gsap.set(details, { autoAlpha: expanded ? 1 : 0, height: expanded ? 'auto' : 0 });
    // Nothing is animating, so there is no collapse to outlast.
    isElevated.value = expanded;
    return;
  }

  if (expanded) {
    gsap.set(card, { width: expandedWidth });
    const detailsHeight = details.scrollHeight;
    gsap.set(card, { width: '100%' });

    activeTimeline = gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          activeTimeline = null;
        },
      })
      .to(card, { width: expandedWidth, x: expandedX, y: -10, scale: 1.025, duration: 0.36 })
      .to(details, { autoAlpha: 1, height: detailsHeight, duration: 0.4 }, 0.06);
    return;
  }

  activeTimeline = gsap
    .timeline({
      defaults: { ease: 'power2.inOut' },
      // Drop back into the grid only once the card is its own size again.
      onComplete: () => {
        activeTimeline = null;
        isElevated.value = false;
      },
    })
    .to(details, { autoAlpha: 0, height: 0, duration: 0.24 })
    .to(card, { width: '100%', x: 0, y: 0, scale: 1, duration: 0.32 }, 0);
}

function setExpanded(expanded: boolean) {
  if (isDragging.value || isExpanded.value === expanded) return;

  isExpanded.value = expanded;
  // Lift before growing, so the card is never briefly wide and under the grid.
  if (expanded) isElevated.value = true;

  void nextTick(() => animateCard(expanded));
}

function syncExpandedState() {
  setExpanded(props.forceExpanded || isPointerOver.value || isFocused.value);
}

function handlePointerEnter() {
  isPointerOver.value = true;
  syncExpandedState();
}

function handlePointerLeave() {
  isPointerOver.value = false;
  syncExpandedState();
}

function handleFocusIn() {
  isFocused.value = true;
  syncExpandedState();
}

function handleFocusOut(event: FocusEvent) {
  const currentTarget = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (
    currentTarget instanceof HTMLElement &&
    nextTarget instanceof Node &&
    currentTarget.contains(nextTarget)
  ) {
    return;
  }

  isFocused.value = false;
  syncExpandedState();
}

function handleClick(event: MouseEvent) {
  if (props.readonly) return;

  event.stopPropagation();
  emit('click', props.course);
}

function handleClone(event: MouseEvent) {
  event.stopPropagation();
  emit('clone', props.course);
}

function handleDragStart(event: DragEvent) {
  if (props.readonly || !event.dataTransfer) return;

  isDragging.value = true;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('courseId', props.course.id.toString());

  const card = cardRef.value;
  if (card) {
    const bounds = card.getBoundingClientRect();
    event.dataTransfer.setDragImage(card, event.clientX - bounds.left, event.clientY - bounds.top);
  }
}

function handleDragEnd() {
  isDragging.value = false;
  syncExpandedState();
}

let resyncFrame = 0;

function cancelHoverResync() {
  if (resyncFrame) {
    cancelAnimationFrame(resyncFrame);
    resyncFrame = 0;
  }
}

/**
 * Re-derive hover and focus from the DOM once the modal is really gone.
 *
 * While a sheet is open the card is not the browser's hover target, so
 * `isPointerOver` has already been driven to false by a genuine `pointerleave`.
 * Trusting that on close is wrong: it collapses a card the pointer never left,
 * and the browser then re-fires `pointerenter` as the overlay unmounts and
 * hit-testing resumes, producing a visible collapse-then-expand flash.
 *
 * We cannot read `:hover` immediately either — reka locks the page with
 * `pointer-events: none` on <body> while the overlay animates out, and nothing
 * is hit-testable until that clears. So wait for the lock to lift, leaving the
 * card as-is meanwhile, then ask the DOM what is actually true.
 */
function scheduleHoverResync() {
  cancelHoverResync();

  const startedAt = performance.now();

  const step = () => {
    const locked = getComputedStyle(document.body).pointerEvents === 'none';

    // Cap the wait so a stuck overlay can never strand the card expanded.
    if (locked && performance.now() - startedAt < 1000) {
      resyncFrame = requestAnimationFrame(step);
      return;
    }

    resyncFrame = 0;

    // Hover is the only thing that keeps the card open here. Closing the sheet
    // restores focus to the card that opened it, so `document.activeElement`
    // lands back inside this component — and it even matches `:focus-visible`
    // when the sheet was dismissed with Escape. That is the modal handing focus
    // back, not the user pointing at this card, so it must not hold the card
    // open. Deliberate focus still expands normally through `focusin`.
    isPointerOver.value = rootRef.value?.matches(':hover') ?? false;
    isFocused.value = false;

    syncExpandedState();
  };

  resyncFrame = requestAnimationFrame(step);
}

watch(
  () => props.forceExpanded,
  (forceExpanded) => {
    if (forceExpanded) {
      cancelHoverResync();
      syncExpandedState();
      return;
    }

    scheduleHoverResync();
  },
);

onMounted(() => {
  const details = detailsRef.value;
  if (details) {
    gsap.set(details, { autoAlpha: 0, height: 0 });
  }
});

onBeforeUnmount(() => {
  cancelHoverResync();
  activeTimeline?.kill();
  activeTimeline = null;
  gsap.killTweensOf([cardRef.value, detailsRef.value]);
});
</script>

<template>
  <div
    ref="root"
    class="group relative min-h-20"
    @click="handleClick"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
  >
    <div
      ref="card"
      :draggable="!readonly"
      :class="cardClasses"
      :style="colorVars"
      :role="readonly ? 'article' : 'button'"
      :tabindex="tabindex"
      :aria-expanded="isExpanded"
      :aria-label="`${course.name}, phòng ${course.room}`"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      <CourseCardPixelBackground :active="isExpanded" />

      <!-- Colour rail. Carries the subject identity without saturating the whole
           card, so the title keeps full contrast against the tinted surface. -->
      <div class="absolute inset-y-0 left-0 z-10 w-1 bg-(--course-accent)" />

      <div class="relative z-10 pl-1">
        <div class="flex min-h-20 items-center gap-3 p-3">
          <div class="min-w-0 flex-1">
            <h4 class="line-clamp-2 text-sm/snug font-semibold text-card-foreground">
              {{ course.name }}
            </h4>
            <div class="flex items-center justify-between gap-2 mt-2">
              <div class="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                <MapPin class="size-3.5 shrink-0 text-(--course-accent)" />
                <span class="truncate">{{ course.room }}</span>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                <span v-if="live" class="relative flex size-2" title="Đang diễn ra">
                  <span
                    class="absolute inline-flex size-full animate-ping rounded-full bg-(--now) opacity-70 motion-reduce:hidden"
                  />
                  <span class="relative inline-flex size-2 rounded-full bg-(--now)" />
                  <span class="sr-only">Đang diễn ra</span>
                </span>
                <Badge variant="outline">
                  {{ courseType }}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div ref="details" class="h-0 overflow-hidden px-3" :aria-hidden="!isExpanded">
          <div class="flex flex-col gap-3 border-t border-border/70 py-3">
            <motion.div
              :initial="{ opacity: 0, y: 10, scale: 0.98 }"
              :animate="{
                opacity: isExpanded ? 1 : 0,
                y: isExpanded ? 0 : 10,
                scale: isExpanded ? 1 : 0.98,
              }"
              :transition="{ ...detailTransition, delay: isExpanded ? 0.08 : 0 }"
              class="flex flex-wrap gap-1.5"
            >
              <Badge v-if="live" class="border-transparent bg-(--now) text-(--now-foreground)">
                Đang diễn ra
              </Badge>
              <Badge v-if="course.code" variant="outline">{{ course.code }}</Badge>
              <Badge variant="secondary">{{ course.credits }} tín chỉ</Badge>
              <Badge v-if="course.studyGroup" variant="secondary">{{ course.studyGroup }}</Badge>
            </motion.div>

            <motion.div
              :initial="{ opacity: 0, y: 10 }"
              :animate="{ opacity: isExpanded ? 1 : 0, y: isExpanded ? 0 : 10 }"
              :transition="{ ...detailTransition, delay: isExpanded ? 0.14 : 0 }"
              class="flex items-start gap-2 text-sm"
            >
              <User class="mt-0.5 size-4 shrink-0 text-primary" />
              <div class="min-w-0">
                <p class="text-xs font-medium text-muted-foreground">Giảng viên</p>
                <p class="mt-0.5 wrap-break-word text-foreground">{{ course.instructor }}</p>
              </div>
            </motion.div>

            <motion.div
              v-if="course.notes"
              :initial="{ opacity: 0, y: 10 }"
              :animate="{ opacity: isExpanded ? 1 : 0, y: isExpanded ? 0 : 10 }"
              :transition="{ ...detailTransition, delay: isExpanded ? 0.2 : 0 }"
              class="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground"
            >
              {{ course.notes }}
            </motion.div>

            <motion.div
              v-if="!readonly"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: isExpanded ? 1 : 0, y: isExpanded ? 0 : 8 }"
              :transition="{ ...detailTransition, delay: isExpanded ? 0.24 : 0 }"
              class="flex items-center justify-between gap-2 border-t border-border/70 pt-3"
            >
              <span class="text-xs text-muted-foreground">Kéo để di chuyển</span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
                  title="Nhân bản môn học"
                  @click="handleClone"
                >
                  <Copy class="size-3.5" />
                </button>
                <button
                  type="button"
                  class="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
                  title="Chỉnh sửa môn học"
                >
                  <Pencil class="size-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
