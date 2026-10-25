export const PANEL_TABS = ['thisPage', 'library', 'gallery', 'editor', 'settings', 'backup'] as const
export const FULL_TAB_TABS = ['library', 'gallery', 'editor', 'settings', 'backup', 'api'] as const
export const ALL_TABS = ['thisPage', 'library', 'gallery', 'editor', 'settings', 'backup', 'api'] as const
export type StudioTab = (typeof ALL_TABS)[number]
