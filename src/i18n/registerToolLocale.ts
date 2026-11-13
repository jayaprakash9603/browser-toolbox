import i18n from '@/i18n'

/** Register strings when a tool (or lazy page) chunk loads; keeps the boot i18n catalog small. */
export function registerToolLocale(strings: Record<string, string>) {
  i18n.addResources('en', 'translation', strings)
}
