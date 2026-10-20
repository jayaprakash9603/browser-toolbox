export const INTERCEPTOR_TABS = ['rules', 'network', 'library', 'settings'] as const
export type InterceptorTab = (typeof INTERCEPTOR_TABS)[number]
