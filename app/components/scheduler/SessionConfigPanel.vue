<script setup lang="ts">
import type { SessionConfig } from '~~/types/scheduler';
import { SESSIONS } from '~~/types/scheduler';
import { Clock, Save } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    sessions: SessionConfig[];
    readonly?: boolean;
  }>(),
  {
    readonly: false,
  },
);

const emit = defineEmits<{
  update: [sessions: SessionConfig[]];
}>();

const localSessions = ref<SessionConfig[]>([...props.sessions]);

watch(
  () => props.sessions,
  (newSessions) => {
    localSessions.value = [...newSessions];
  },
  { deep: true },
);

function findSession(sessionNumber: number) {
  return localSessions.value.find((s) => s.sessionNumber === sessionNumber);
}

function updateSession(
  sessionNumber: number,
  field: 'startTime' | 'duration',
  value: string | number,
) {
  const session = findSession(sessionNumber);
  if (!session) return;

  if (field === 'startTime') {
    session.startTime = value as string;
  } else {
    session.duration = value as number;
  }
}

function saveChanges() {
  emit('update', localSessions.value);
}
</script>

<template>
  <!--
    Content only. The dock's popover owns the surface and the open/close state,
    so the panel no longer carries its own card or collapse header.
  -->
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div
        v-for="sessionNum in SESSIONS"
        :key="sessionNum"
        class="rounded-lg border border-border bg-muted/30 p-3"
      >
        <h4 class="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock class="size-4 text-primary" />
          Ca {{ sessionNum }}
        </h4>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <Label :for="`session-${sessionNum}-start`" class="text-xs">Giờ bắt đầu</Label>
            <Input
              :id="`session-${sessionNum}-start`"
              type="time"
              :model-value="findSession(sessionNum)?.startTime"
              :disabled="readonly"
              class="h-9 tabular-nums"
              @update:model-value="updateSession(sessionNum, 'startTime', String($event))"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label :for="`session-${sessionNum}-duration`" class="text-xs">
              Thời lượng (phút)
            </Label>
            <Input
              :id="`session-${sessionNum}-duration`"
              type="number"
              min="15"
              max="240"
              step="15"
              :model-value="findSession(sessionNum)?.duration"
              :disabled="readonly"
              class="h-9 tabular-nums"
              @update:model-value="updateSession(sessionNum, 'duration', Number($event))"
            />
          </div>
        </div>
      </div>
    </div>

    <Button v-if="!readonly" class="w-full" @click="saveChanges">
      <Save class="size-4" />
      Lưu cấu hình
    </Button>
  </div>
</template>
