export interface PipState {
  enabled: boolean
  autoPip: boolean
  showContextMenu: boolean
}

export type PipToggleResult = {
  action: 'entered' | 'exited' | 'none' | 'error'
  gestureRequired?: boolean
}

export const PIP_MENU_ID = 'toolbox.pip.toggle'
export const PIP_AUTO_SCRIPT_ID = 'pip-auto'
