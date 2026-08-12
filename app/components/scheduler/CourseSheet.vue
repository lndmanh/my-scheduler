<script setup lang="ts">
import { useForm } from 'vee-validate';
import { courseFormSchema } from '#shared/schemas/schedulerSchema';
import { DAYS, DAY_LABELS, SESSIONS } from '~~/types/scheduler';
import type { Course, CourseFormData, Day, SessionNumber } from '~~/types/scheduler';
import { BookOpen, LoaderCircle, Save, Trash2 } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    course?: Course | null;
    defaultDay?: Day;
    defaultSession?: SessionNumber;
    submitting?: boolean;
  }>(),
  {
    course: null,
    defaultDay: 'Mon',
    defaultSession: 1,
    submitting: false,
  },
);

const emit = defineEmits<{
  'update:open': [value: boolean];
  submit: [data: CourseFormData];
  delete: [courseId: number];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const isEditMode = computed(() => Boolean(props.course));
const sheetTitle = computed(() => (isEditMode.value ? 'Chỉnh sửa môn học' : 'Thêm môn học'));
const sheetDescription = computed(() =>
  isEditMode.value
    ? 'Cập nhật thông tin học phần và vị trí trong thời khóa biểu.'
    : 'Thêm một học phần mới vào thời khóa biểu của bạn.',
);
const selectedSlotLabel = computed(() => {
  const day = props.course?.day ?? props.defaultDay;
  const session = props.course?.session ?? props.defaultSession;

  return `${DAY_LABELS[day]} · Ca ${session}`;
});

function getInitialValues(course: Course | null | undefined) {
  if (course) {
    return {
      name: course.name,
      instructor: course.instructor,
      credits: course.credits,
      room: course.room,
      day: course.day,
      session: course.session,
      courseType: course.courseType,
      studyGroup: course.studyGroup || '',
      code: course.code || '',
      notes: course.notes || '',
    };
  }

  return {
    name: '',
    instructor: '',
    credits: 3,
    room: '',
    day: props.defaultDay,
    session: props.defaultSession,
    courseType: 'theory' as const,
    studyGroup: '',
    code: '',
    notes: '',
  };
}

const { handleSubmit, resetForm } = useForm({
  validationSchema: courseFormSchema,
  initialValues: getInitialValues(props.course),
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      resetForm({ values: getInitialValues(props.course) });
    }
  },
);

const onSubmit = handleSubmit((formValues) => {
  emit('submit', formValues);
});

function closeSheet() {
  isOpen.value = false;
}

function handleDelete() {
  if (props.course) {
    emit('delete', props.course.id);
  }
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent side="right" class="w-full gap-0 p-0 sm:max-w-xl">
      <SheetHeader class="gap-3 border-b bg-muted/30 p-5 pr-12">
        <div class="flex items-start gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <BookOpen class="size-5" />
          </div>
          <div class="flex flex-col gap-1">
            <SheetTitle>{{ sheetTitle + ' - ' + selectedSlotLabel }}</SheetTitle>
            <SheetDescription>{{ sheetDescription }}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <form class="flex min-h-0 flex-1 flex-col" @submit="onSubmit">
        <div class="min-h-0 flex-1 overflow-y-auto p-5">
          <div class="flex flex-col gap-7">
            <section class="flex flex-col gap-4">
              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-semibold">Thông tin học phần</h3>
                <p class="text-sm text-muted-foreground">
                  Nhập những thông tin cần thiết để dễ nhận diện môn học.
                </p>
              </div>

              <div class="grid gap-4">
                <FormField v-slot="{ componentField }" name="name">
                  <FormItem>
                    <FormLabel>Tên học phần</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        type="text"
                        placeholder="Ví dụ: Nhập môn Khoa học Máy tính"
                        :disabled="submitting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <div class="grid gap-4 sm:grid-cols-2">
                  <FormField v-slot="{ componentField }" name="code">
                    <FormItem>
                      <FormLabel>Mã học phần</FormLabel>
                      <FormControl>
                        <Input
                          v-bind="componentField"
                          type="text"
                          placeholder="Ví dụ: 123456"
                          :disabled="submitting"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <FormField v-slot="{ componentField }" name="credits">
                    <FormItem>
                      <FormLabel>Số tín chỉ</FormLabel>
                      <FormControl>
                        <Input
                          v-bind="componentField"
                          type="number"
                          min="1"
                          max="10"
                          :disabled="submitting"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>

                <FormField v-slot="{ componentField }" name="instructor">
                  <FormItem>
                    <FormLabel>Giảng viên</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        type="text"
                        placeholder="Ví dụ: TS. Nguyễn Văn A"
                        :disabled="submitting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>

            <section class="flex flex-col gap-4 border-t pt-6">
              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-semibold">Lịch học</h3>
                <p class="text-sm text-muted-foreground">
                  Chọn buổi học và phòng để đặt môn vào đúng ô lịch.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <FormField v-slot="{ componentField }" name="day">
                  <FormItem>
                    <FormLabel>Thứ</FormLabel>
                    <Select v-bind="componentField" :disabled="submitting">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn thứ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem v-for="day in DAYS" :key="day" :value="day">
                            {{ DAY_LABELS[day] }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="session">
                  <FormItem>
                    <FormLabel>Ca học</FormLabel>
                    <Select v-bind="componentField" :disabled="submitting">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ca học" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem v-for="session in SESSIONS" :key="session" :value="session">
                            Ca {{ session }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="room">
                  <FormItem class="sm:col-span-2">
                    <FormLabel>Phòng học</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        type="text"
                        placeholder="Ví dụ: A-101"
                        :disabled="submitting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>

            <section class="flex flex-col gap-4 border-t pt-6">
              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-semibold">Phân loại và ghi chú</h3>
                <p class="text-sm text-muted-foreground">
                  Các chi tiết này giúp lịch học rõ ràng hơn khi xem nhanh.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <FormField v-slot="{ componentField }" name="courseType">
                  <FormItem>
                    <FormLabel>Hình thức học</FormLabel>
                    <Select v-bind="componentField" :disabled="submitting">
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hình thức" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="theory">Lý thuyết</SelectItem>
                          <SelectItem value="practical">Thực hành</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="studyGroup">
                  <FormItem>
                    <FormLabel>Nhóm học</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        type="text"
                        placeholder="Ví dụ: Nhóm 1"
                        :disabled="submitting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <FormField v-slot="{ componentField }" name="notes">
                  <FormItem class="sm:col-span-2">
                    <FormLabel>Ghi chú</FormLabel>
                    <FormControl>
                      <Textarea
                        v-bind="componentField"
                        rows="4"
                        placeholder="Ví dụ: Mang theo laptop hoặc lịch kiểm tra giữa kỳ"
                        :disabled="submitting"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>
          </div>
        </div>

        <SheetFooter class="border-t bg-background p-5">
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              v-if="isEditMode"
              type="button"
              variant="destructive"
              :disabled="submitting"
              @click="handleDelete"
            >
              <Trash2 data-icon="inline-start" />
              Xóa môn học
            </Button>
            <div class="flex flex-col-reverse gap-2 sm:ml-auto sm:flex-row">
              <Button type="button" variant="outline" :disabled="submitting" @click="closeSheet">
                Hủy
              </Button>
              <Button type="submit" :disabled="submitting">
                <LoaderCircle v-if="submitting" class="animate-spin" data-icon="inline-start" />
                <Save v-else data-icon="inline-start" />
                {{ isEditMode ? 'Lưu thay đổi' : 'Thêm môn học' }}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
