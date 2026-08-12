export function getUserCacheKey(id: number): string {
  return `user:${id}`;
}

export function getScheduleCacheKey(id: string): string {
  return `schedule:${id}`;
}

export function getCourseCacheKey(id: number): string {
  return `course:${id}`;
}
