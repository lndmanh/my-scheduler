<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import type { Day, SessionConfig } from '~~/types/scheduler';
import DayToggle from './DayToggle.vue';
import SessionConfigPanel from './SessionConfigPanel.vue';
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Ellipsis,
  Eye,
  LogIn,
  Pencil,
  Plus,
  Share2,
  Upload,
  Users,
  X,
} from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    scheduleName: string;
    readonly?: boolean;
    canShare?: boolean;
    totalCourses: number;
    totalCredits: number;
    totalInstructors: number;
    hasCourseCodes?: boolean;
    copiedCourseCodes?: boolean;
    hiddenDays: Set<Day>;
    sessionsConfig: SessionConfig[];
  }>(),
  {
    readonly: false,
    canShare: false,
    hasCourseCodes: false,
    copiedCourseCodes: false,
  },
);

const emit = defineEmits<{
  rename: [name: string];
  addCourse: [];
  toggleDay: [day: Day];
  updateSessions: [sessions: SessionConfig[]];
  import: [];
  export: [];
  exportCalendar: [];
  copyCourseCodes: [];
  share: [];
}>();

const isEditingName = ref(false);
const tempName = ref('');
const nameInput = useTemplateRef<ComponentPublicInstance>('nameInput');

function startEditingName() {
  if (props.readonly) return;

  tempName.value = props.scheduleName;
  isEditingName.value = true;

  // `Input` is a single-root component with no `defineExpose`, so the template
  // ref resolves to the component proxy rather than the element.
  void nextTick(() => {
    const el = nameInput.value?.$el;
    if (el instanceof HTMLInputElement) {
      el.focus();
      el.select();
    }
  });
}

function saveName() {
  const next = tempName.value.trim();
  if (!next) return;

  emit('rename', next);
  isEditingName.value = false;
}

function cancelEditingName() {
  isEditingName.value = false;
  tempName.value = '';
}

const stats = computed(() => [
  { icon: BookOpen, value: props.totalCourses, label: 'môn', full: 'Tổng số môn' },
  { icon: Award, value: props.totalCredits, label: 'tín chỉ', full: 'Tổng số tín chỉ' },
  { icon: Users, value: props.totalInstructors, label: 'GV', full: 'Giảng viên' },
]);
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom,0px)] md:bottom-6 md:px-6 md:pb-0"
  >
    <div
      class="app-toolbar flex w-full max-w-4xl flex-wrap items-center gap-x-3 gap-y-2 rounded-t-2xl px-3 py-2 md:w-auto md:rounded-2xl md:px-4 md:py-2.5"
    >
      <!-- Identity. Hidden on mobile, where the breadcrumb already carries the name. -->
      <div class="hidden min-w-0 items-center gap-3 md:flex">
        <div v-if="isEditingName" class="flex items-center gap-1">
          <Input
            ref="nameInput"
            v-model="tempName"
            class="h-8 w-48 font-semibold"
            aria-label="Tên thời khóa biểu"
            @keyup.enter="saveName"
            @keyup.esc="cancelEditingName"
          />
          <Button variant="ghost" size="icon" class="size-8 text-success" @click="saveName">
            <Check class="size-4" />
            <span class="sr-only">Lưu tên</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="size-8 text-muted-foreground"
            @click="cancelEditingName"
          >
            <X class="size-4" />
            <span class="sr-only">Hủy</span>
          </Button>
        </div>

        <button
          v-else
          type="button"
          class="group flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          :class="readonly ? 'cursor-default' : 'hover:bg-accent'"
          :disabled="readonly"
          @click="startEditingName"
        >
          <span class="max-w-40 truncate">{{ scheduleName }}</span>
          <Pencil
            v-if="!readonly"
            class="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>

        <!-- Stats. One treatment for all three — they are parallel data. -->
        <div class="flex items-center gap-2">
          <span
            v-for="stat in stats"
            :key="stat.label"
            class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums"
            :title="stat.full"
          >
            <component :is="stat.icon" class="size-3.5 text-primary" />
            {{ stat.value }} {{ stat.label }}
          </span>
        </div>

        <Separator orientation="vertical" class="data-[orientation=vertical]:h-6" />
      </div>

      <!-- Actions -->
      <div class="flex w-full items-center gap-1.5 md:w-auto">
        <template v-if="!readonly">
          <Button class="flex-1 md:flex-none" @click="emit('addCourse')">
            <Plus class="size-4" />
            <span class="md:inline">Thêm môn học</span>
          </Button>

          <Popover>
            <PopoverTrigger as-child>
              <Button variant="outline" size="icon" title="Hiển thị ngày">
                <Eye class="size-4" />
                <span class="sr-only">Hiển thị ngày</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" :side-offset="10" class="w-80">
              <h3 class="mb-3 text-sm font-semibold">Hiển thị ngày</h3>
              <DayToggle :hidden-days="hiddenDays" @toggle="emit('toggleDay', $event)" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger as-child>
              <Button variant="outline" size="icon" title="Cấu hình ca học">
                <Clock class="size-4" />
                <span class="sr-only">Cấu hình ca học</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" :side-offset="10" class="w-90">
              <h3 class="mb-3 text-sm font-semibold">Cấu hình ca học</h3>
              <SessionConfigPanel
                :sessions="sessionsConfig"
                @update="emit('updateSessions', $event)"
              />
            </PopoverContent>
          </Popover>
        </template>

        <!-- Read-only viewers still get the share link they were given. -->
        <template v-else>
          <!-- Hidden on phones: it wraps at that width, and the Đăng nhập
               button already tells the viewer they cannot edit. -->
          <span
            class="hidden shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground sm:inline-flex"
          >
            <Eye class="size-3.5" />
            Chế độ xem
          </span>
          <Button
            v-if="canShare"
            variant="outline"
            class="flex-1 md:flex-none"
            @click="emit('share')"
          >
            <Share2 class="size-4" />
            Chia sẻ
          </Button>
          <Button class="flex-1 md:flex-none" @click="navigateTo('/auth/login')">
            <LogIn class="size-4" />
            Đăng nhập
          </Button>
        </template>

        <DropdownMenu v-if="!readonly">
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="icon" title="Thêm hành động">
              <Ellipsis class="size-4" />
              <span class="sr-only">Thêm hành động</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" :side-offset="10" class="w-56">
            <DropdownMenuItem @click="emit('import')">
              <Upload class="size-4" />
              Nhập file
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('export')">
              <Download class="size-4" />
              Xuất file
            </DropdownMenuItem>
            <DropdownMenuItem @click="emit('exportCalendar')">
              <Calendar class="size-4" />
              Xuất lịch
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem :disabled="!hasCourseCodes" @click="emit('copyCourseCodes')">
              <Check v-if="copiedCourseCodes" class="size-4" />
              <Copy v-else class="size-4" />
              {{ copiedCourseCodes ? 'Đã sao chép mã HP' : 'Sao chép mã HP' }}
            </DropdownMenuItem>
            <DropdownMenuItem v-if="canShare" @click="emit('share')">
              <Share2 class="size-4" />
              Chia sẻ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
