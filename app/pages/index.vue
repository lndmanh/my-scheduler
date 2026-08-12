<script setup lang="ts">
import { useSchedulerStore } from '@/stores/scheduler';
import { Trash2, Calendar, Plus } from '@lucide/vue';

definePageMeta({
  title: 'Dashboard',
  breadcrumb: 'Dashboard',
  layout: 'dashboard',
});

const schedulerStore = useSchedulerStore();
const router = useRouter();

onMounted(async () => {
  await schedulerStore.fetchSchedules();
});

async function handleCreate() {
  const newId = await schedulerStore.createSchedule();
  router.push(`/scheduler/${newId}`);
}

async function handleDelete(id: string) {
  if (confirm('Bạn có chắc chắn muốn xóa thời khóa biểu này không?')) {
    await schedulerStore.deleteSchedule(id);
  }
}
</script>

<template>
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">Danh sách thời khóa biểu</h1>
        <Button @click="handleCreate">
          <Plus class="size-4 mr-2" />
          Tạo mới
        </Button>
      </div>

      <div
        v-if="schedulerStore.loading && schedulerStore.schedules.length === 0"
        class="flex justify-center p-8"
      >
        <div class="animate-spin rounded-full size-8 border-b-2 border-primary" />
      </div>

      <div
        v-else-if="schedulerStore.schedules.length === 0"
        class="text-center p-8 text-muted-foreground bg-muted/50 rounded-lg border border-dashed"
      >
        Chưa có thời khóa biểu nào. Hãy tạo mới ngay!
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="schedule in schedulerStore.schedules"
          :key="schedule.id"
          class="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer bg-card group relative"
          @click="router.push(`/scheduler/${schedule.id}`)"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div
                class="p-2 bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              >
                <Calendar class="size-5" />
              </div>
              <div>
                <h3 class="font-semibold line-clamp-1">
                  {{ schedule.name }}
                </h3>
                <p class="text-xs text-muted-foreground">
                  Cập nhật: {{ new Date(schedule.updatedAt).toLocaleDateString('vi-VN') }}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="text-destructive hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
              @click.stop="handleDelete(schedule.id)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
</template>
