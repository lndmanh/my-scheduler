<script setup lang="ts">
import { DAYS, SESSIONS } from '~~/types/scheduler';

/**
 * Mirrors SchedulerGrid's column template and cell heights so the real grid
 * lands in place without a layout shift.
 */
const gridTemplateColumns = `minmax(4.75rem, auto) repeat(${DAYS.length}, minmax(9rem, 1fr))`;
</script>

<template>
  <div class="overflow-x-auto" aria-busy="true" aria-live="polite">
    <span class="sr-only">Đang tải thời khóa biểu</span>
    <div class="grid gap-2" :style="{ gridTemplateColumns }">
      <Skeleton class="h-10 rounded-lg" />
      <Skeleton v-for="day in DAYS" :key="`head-${day}`" class="h-10 rounded-lg" />

      <template v-for="session in SESSIONS" :key="session">
        <Skeleton class="h-30 rounded-lg" />
        <Skeleton v-for="day in DAYS" :key="`${day}-${session}`" class="h-30 rounded-lg" />
      </template>
    </div>
  </div>
</template>
