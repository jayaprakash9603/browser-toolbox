/** One Panel simulator overlay icons (Lucide-compatible strokes, no external font). */

const stroke = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"'

export const OVERLAY_ICONS = {
  close: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  devices: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`,
  reload: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
  screenshot: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  video: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`,
  compare: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
  launch: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  help: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
} as const

export const OVERLAY_KIND_ICONS: Record<string, string> = {
  phone: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
  tablet: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9"/><path d="M2 17h20"/></svg>`,
  desktop: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
  watch: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><circle cx="12" cy="12" r="6"/><path d="M12 6v-2"/><path d="M12 20v-2"/><path d="M6 12H4"/><path d="M20 12h-2"/></svg>`,
  special: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
  all: OVERLAY_ICONS.compare,
  favorites: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  recents: `<svg viewBox="0 0 24 24" width="20" height="20" ${stroke}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>`,
}

export function overlayIcon(svg: string): string {
  return svg
}

export function overlayKindIcon(id: string): string {
  return OVERLAY_KIND_ICONS[id] ?? OVERLAY_KIND_ICONS.all
}