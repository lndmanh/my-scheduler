<script setup lang="ts">
import { MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from '@lucide/vue'

const colorMode = useColorMode()

const themeOptions = computed(() => [
  { value: 'light', label: 'Sáng', icon: SunIcon },
  { value: 'dark', label: 'Tối', icon: MoonIcon },
  { value: 'system', label: 'Hệ thống', icon: MonitorIcon },
])

function updateTheme(value: string | string[] | undefined) {
  if (value !== 'light' && value !== 'dark' && value !== 'system') {
    return
  }

  colorMode.preference = value
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
      >
        <SettingsIcon data-icon="inline-start" />
        <span class="sr-only">Mở tùy chọn bảng điều khiển</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-80"
      align="end"
      :side-offset="10"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <SunIcon data-icon="inline-start" />
            Giao diện
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            class="w-full"
            :model-value="colorMode.preference"
            @update:model-value="updateTheme"
          >
            <ToggleGroupItem
              v-for="option in themeOptions"
              :key="option.value"
              :value="option.value"
              class="flex-1 gap-1.5"
              :aria-label="option.label"
            >
              <component
                :is="option.icon"
                data-icon="inline-start"
                class="size-4"
              />
              {{ option.label }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
