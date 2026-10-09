export const TOOLBOX_FOCUS_HOME_SEARCH = 'toolbox:focus-home-search'

export function requestFocusHomeSearch() {
  window.dispatchEvent(new CustomEvent(TOOLBOX_FOCUS_HOME_SEARCH))
}
