<template>
  <div>
    <SidebarProvider>
      <AppSidebar :variant="sidebarVariant" />
      <SidebarInset>
        <div
          class="flex flex-1 min-h-dvh overflow-hidden"
        >
          <div
            class="flex flex-1 min-w-0 flex-col overflow-hidden transition-[padding-right] duration-200 ease-out"
          >
            <AppLayout>
              <template #title-controls>
                <DashboardSettingsPopover />
              </template>
              <slot />
            </AppLayout>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>

<script setup lang="ts">
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import AppLayout from '@/components/AppLayout.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import DashboardSettingsPopover from '@/components/DashboardSettingsPopover.vue'

const { sidebarVariant: contextVariant } = useSidebarContext()

const sidebarVariant = computed(() => {
  return contextVariant.value
})
</script>
