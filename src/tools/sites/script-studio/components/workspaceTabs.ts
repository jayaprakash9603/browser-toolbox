export const PANEL_TABS = ['thisPage', 'library', 'editor', 'trash', 'settings', 'backup'] as const
export const DASHBOARD_TABS = ['library', 'editor', 'trash', 'settings', 'backup', 'api'] as const
export type StudioTab = (typeof PANEL_TABS)[number] | (typeof DASHBOARD_TABS)[number]
