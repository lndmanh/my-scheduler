import type { SidebarContext, SidebarGuardUser, SidebarItem } from '~~/types/common';
import {
  Home,
  LayoutDashboardIcon,
  UsersIcon,
} from '@lucide/vue';

export const SIDEBAR_CONTEXTS: SidebarContext[] = [
  {
    id: 'admin',
    match: '/admin',
    variant: 'inset',
    showBack: true,
    sections: [
      {
        title: 'Người dùng',
        items: [{ title: 'Người dùng', url: '/admin/users', icon: UsersIcon }],
      },
    ],
  },
  {
    id: 'main',
    match: '/',
    sections: [
      {
        title: 'Khám phá',
        items: [
          { title: 'Trang chủ', url: '/', icon: Home },
        ],
      },
      {
        title: 'Quản trị',
        guard: (user: SidebarGuardUser) => user?.isAdmin === true,
        items: [{ title: 'Bảng điều khiển', url: '/admin', icon: LayoutDashboardIcon }],
      },
    ],
  },
];

export function getAllSidebarItems(): SidebarItem[] {
  return SIDEBAR_CONTEXTS.flatMap((ctx) => ctx.sections.flatMap((section) => section.items));
}
