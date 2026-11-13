export const SIMULATOR_PARENT_ID = 'toolbox.simulator'
export const SIMULATOR_OPEN_PAGE = 'toolbox.simulator.open'
export const SIMULATOR_OPEN_LINK = 'toolbox.simulator.link'
export const SIMULATOR_OPEN_DEVICE = 'toolbox.simulator.device'
export const SIMULATOR_CAPTURE = 'toolbox.simulator.capture'
export const SIMULATOR_PANEL = 'toolbox.simulator.panel'

export function isSimulatorMenuItem(id: string): boolean {
  return id === SIMULATOR_PARENT_ID || id.startsWith(`${SIMULATOR_PARENT_ID}.`)
}
