const HASH_SUFFIX = /(?:^|[._-])(?:[a-f0-9]{5,}|[A-Z0-9]{6,})$/
const CSS_MODULE = /_[A-Z0-9a-z]{5,}$/
const EMOTION = /^css-[a-z0-9]+$/i
const STYLED = /^sc-[a-zA-Z0-9]+$/
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const ARBITRARY = /\[[^\]]+\]/
const LONG_HASH = /^[a-zA-Z]{1,3}[a-zA-Z0-9]{10,}$/

export function isGeneratedClass(name: string): boolean {
  if (!name) return false
  if (ARBITRARY.test(name)) return true
  if (EMOTION.test(name) || STYLED.test(name) || UUID.test(name)) return true
  if (HASH_SUFFIX.test(name) || CSS_MODULE.test(name)) return true
  if (LONG_HASH.test(name) && /[A-Z]/.test(name) && /\d/.test(name)) return true
  return false
}

export function generatedClassesOf(classes: string[]): string[] {
  return classes.filter(isGeneratedClass)
}

export function looksStableId(id: string): boolean {
  if (!id) return false
  if (UUID.test(id)) return false
  if (/^\d+$/.test(id)) return false
  if (HASH_SUFFIX.test(id) && id.length > 12) return false
  return true
}
