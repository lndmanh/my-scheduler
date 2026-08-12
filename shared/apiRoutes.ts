import type { NuxtSecurityRouteRules } from 'nuxt-security';

const apiRules: NuxtSecurityRouteRules = {
  rateLimiter: {
    tokensPerInterval: 150,
    interval: 60000, // 60 seconds
    headers: true,
    throwError: true,
  },
};

export const apiRoutes = {
  root: '/api',
  auth: {
    loginPassword: '/api/auth/login-password',
    registerPassword: '/api/auth/register-password',
  },
  users: {
    current: '/api/users/me',
  },
  admin: {
    clearServerCache: '/api/admin/clear-server-cache',
    users: {
      index: '/api/admin/users',
      removeMany: '/api/admin/users/delete',
      byId: (userId: number) => `/api/admin/users/${userId}`,
    },
  },
  courses: {
    index: '/api/courses',
    byId: (courseId: number) => `/api/courses/${courseId}`,
  },
  schedules: {
    index: '/api/schedules',
    byId: (scheduleId: string) => `/api/schedules/${encodeURIComponent(scheduleId)}`,
  },
};

// the route rules of the most outer apis should be defined first
export const routeRules = {
  '/api/**': {
    security: apiRules,
  },
  '/api/admin/seed': {
    security: {
      rateLimiter: {
        tokensPerInterval: 5,
        interval: 3 * 60 * 60 * 24 * 1000, // 3 days
        headers: true,
        throwError: true,
      },
    },
  },
  '/admin/**': {
    ssr: false,
    prerender: false,
  },
  '/pwa': {
    ssr: false,
    prerender: false,
  },
  '/settings/**': {
    ssr: false,
    prerender: false,
  },
};
