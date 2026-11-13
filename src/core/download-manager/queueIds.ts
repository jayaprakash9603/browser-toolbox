export function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
