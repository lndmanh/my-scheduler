<script setup lang="ts">
import { ArrowLeft, SearchIcon, LogIn, LogOut } from '@lucide/vue';

import NavMain from '@/components/nav/NavMain.vue';
import NavSecondary from '@/components/nav/NavSecondary.vue';
import NavUser from '@/components/nav/NavUser.vue';
import type { SidebarProps } from '@/components/ui/sidebar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar/utils';

import InstallPrompter from './InstallPrompter.vue';
import { Separator } from './ui/separator';

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: 'inset',
});

const { open } = useSidebar();
const { primarySections, secondarySections, showBack, showMainSidebar } = useSidebarContext();
const { loggedIn, clear } = useUserSession();

async function logout() {
  clear().then(() => {
    location.reload();
  });
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarMenu class="space-y-2">
        <SidebarMenuItem>
          <NavUser />
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarSeparator />
    </SidebarHeader>

    <SidebarContent class="overflow-hidden grid relative">
      <div class="w-full flex flex-col gap-0 overflow-y-auto" style="grid-area: 1 / 1">
        <SidebarGroup v-if="showBack">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Quay lại"
                class="flex items-center"
                @click="showMainSidebar"
              >
                <ArrowLeft />
                <span>Quay lại</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <NavMain
          v-for="section in primarySections"
          :key="section.title"
          :title="section.title"
          :items="section.items"
        />
        <NavSecondary
          v-for="section in secondarySections"
          :key="section.title"
          class="mt-auto"
          :items="section.items"
        />
      </div>
    </SidebarContent>

    <Separator />
    <SidebarFooter>
      <InstallPrompter :sidebar-open="open" />
      <SidebarMenu>
        <SidebarMenuItem>
          <Button v-if="loggedIn" class="w-full" variant="destructive" @click="logout">
            <LogOut class="size-4" />
            Đăng xuất
          </Button>
          <Button v-else class="w-full" @click="navigateTo('/auth/login')">
            <LogIn class="size-4" />
            Đăng nhập
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
