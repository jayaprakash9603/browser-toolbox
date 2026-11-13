import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { openSimulatorForTab, resolveSimulatorTab } from './openSimulator'

export { buildSimulatorMenus } from './menuItem'
export {
  SIMULATOR_CAPTURE,
  SIMULATOR_OPEN_DEVICE,
  SIMULATOR_OPEN_LINK,
  SIMULATOR_OPEN_PAGE,
  SIMULATOR_PANEL,
  SIMULATOR_PARENT_ID,
  isSimulatorMenuItem,
} from './ids'
export { openSimulatorForTab, type SimulatorOpenResult } from './openSimulator'

export async function handleSimulatorMenuClick(
  _menuItemId: string,
  _info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  const target = await resolveSimulatorTab(tab)
  const pageUrl = target?.url && !isRestrictedCaptureUrl(target.url) ? target.url : undefined
  await openSimulatorForTab(target, { url: pageUrl, replace: true })
}
