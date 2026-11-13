export const INTERCEPTOR_TABS = [
  'rules',
  'network',
  'finder',
  'explorer',
  'collections',
  'library',
  'settings',
] as const
export type InterceptorTab = (typeof INTERCEPTOR_TABS)[number]
