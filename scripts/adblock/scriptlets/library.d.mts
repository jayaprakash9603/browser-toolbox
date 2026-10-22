export interface ScriptletSpec {
  fn: (h: unknown, ...args: string[]) => void
  trusted?: boolean
  aliases?: string[]
  deps?: ((...args: never[]) => unknown)[]
}

export const SCRIPTLETS: Record<string, ScriptletSpec>
export function canonicalScriptletName(raw: string): string | null
