import type { ScriptStudioSettings } from './types'

export const DEFAULT_SCRIPT_STUDIO_SETTINGS: ScriptStudioSettings = {
  configMode: 'beginner',
  loggingLevel: 'warn',
  trashMode: 'enabled',
  autoRefreshOnDebug: true,
  showGuideTips: true,
  badgeMode: 'running-instances',
  contextMenuEnabled: true,
  scriptSearchEnabled: true,
  updateIntervalHours: 24,
  checkDisabledScripts: false,
  autoInstallUpdates: false,
  hideUpdateNotificationSec: 8,
  externalsUpdateIntervalHours: 168,
  editorTheme: 'dark',
  editorKeymap: 'default',
  editorIndent: 2,
  editorLint: true,
  editorAutosave: true,
  allowCookieAccess: false,
  connectMode: 'prompt',
  sriMode: 'validate-if-given',
  modifyCsp: 'no',
  allowedSandboxes: ['raw', 'JavaScript'],
  runOnFileUrls: false,
  runInSubframes: true,
  pageBlocklist: [],
  downloadWhitelist: ['zip', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'csv', 'json'],
  downloadMode: 'browser',
  injectMode: 'userscripts-dynamic',
  incognitoEnabled: false,
  separateIncognitoStorage: true,
}

export function mergeSettings(partial?: Partial<ScriptStudioSettings>): ScriptStudioSettings {
  return { ...DEFAULT_SCRIPT_STUDIO_SETTINGS, ...partial }
}
