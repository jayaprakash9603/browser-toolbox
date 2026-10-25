/** Injected at build time from `public/protection/threats.json` (`generated` field). */
declare const __PROTECTION_THREATS_GENERATED__: string

export const bundledThreatsGenerated: string =
  typeof __PROTECTION_THREATS_GENERATED__ === 'string' ? __PROTECTION_THREATS_GENERATED__ : ''
