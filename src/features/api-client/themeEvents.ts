export const TOOLBOX_RESTORE_THEME_EVENT = 'browser-toolbox:restore-theme'

export function dispatchToolboxRestoreTheme(): void {
  window.dispatchEvent(new CustomEvent(TOOLBOX_RESTORE_THEME_EVENT))
}
