<script setup lang="ts">
import type { Day } from '~~/types/scheduler';
import { DAYS, DAY_LABELS } from '~~/types/scheduler';
import { Eye, EyeOff } from '@lucide/vue';

const props = defineProps<{
  hiddenDays: Set<Day>;
}>();

const emit = defineEmits<{
  toggle: [day: Day];
}>();

function isDayVisible(day: Day) {
  return !props.hiddenDays.has(day);
}
</script>

<template>
  <!--
    Content only. The popover in the dock supplies the surface, so this no
    longer paints a card of its own.
  -->
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="day in DAYS"
        :key="day"
        type="button"
        :aria-pressed="isDayVisible(day)"
        class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :class="
          isDayVisible(day)
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground opacity-50 hover:bg-muted/80'
        "
        @click="emit('toggle', day)"
      >
        <component :is="isDayVisible(day) ? Eye : EyeOff" class="size-3.5" />
        {{ DAY_LABELS[day] }}
      </button>
    </div>
    <p class="text-xs text-muted-foreground">Chọn một ngày để ẩn hoặc hiện nó trong lịch.</p>
  </div>
</template>
