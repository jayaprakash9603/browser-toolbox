/**
 * The isolated-world bootstrap hands the page's scriptlets to the MAIN-world runner through this
 * DOM event (when the runner is already listening) or this attribute on <html> (when it is not).
 * Both run at document_start, before any page script, in either order.
 */
export const SCRIPTLET_EVENT = 'tbx-scriptlets'
export const SCRIPTLET_ATTR = 'data-tbx-scriptlets'

/** `[canonical name, args]`, already filtered for this hostname and the enabled lists. */
export type ScriptletCall = [string, string[]]
