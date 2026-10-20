/** Self-contained scrubber sprites (SVG data URIs) for YouTube playhead customization. */

export type ScrubberCollectionId = 'memes' | 'games' | 'cartoons' | 'cute' | 'scifi'

export interface ScrubberAssetDef {
  id: string
  labelKey: string
  collection: ScrubberCollectionId
  /** Lowercase search tokens (id + extras) */
  tags: string[]
  dataUri: string
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`
}

const S = 32

function pixelSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${body}</svg>`
}

/** Bundled scrubber library (fan-art–inspired silhouettes; original SVGs). */
export const SCRUBBER_ASSETS: ScrubberAssetDef[] = [
  {
    id: 'pizza',
    labelKey: 'sites.youtube.scrubber.pizza',
    collection: 'memes',
    tags: ['pizza', 'meme', 'food'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="4" y="14" width="24" height="12" fill="#f4a460"/>
      <circle cx="10" cy="18" r="2" fill="#c41e3a"/>
      <circle cx="16" cy="20" r="2" fill="#c41e3a"/>
      <circle cx="22" cy="17" r="2" fill="#c41e3a"/>
      <path d="M4 14 L16 6 L28 14 Z" fill="#ffd966"/>
    `),
    ),
  },
  {
    id: 'nyan',
    labelKey: 'sites.youtube.scrubber.nyan',
    collection: 'memes',
    tags: ['nyan', 'cat', 'rainbow', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="2" y="14" width="28" height="6" fill="#ffb6c1"/>
      <rect x="6" y="10" width="14" height="10" fill="#9cf"/>
      <rect x="8" y="12" width="4" height="3" fill="#333"/>
      <rect x="14" y="12" width="4" height="3" fill="#333"/>
      <rect x="20" y="11" width="6" height="4" fill="#ffb6c1"/>
    `),
    ),
  },
  {
    id: 'popcat',
    labelKey: 'sites.youtube.scrubber.popcat',
    collection: 'memes',
    tags: ['pop', 'cat', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="12" ry="10" fill="#f5f5f5"/>
      <ellipse cx="10" cy="22" rx="6" ry="4" fill="#fff"/>
      <ellipse cx="22" cy="22" rx="6" ry="4" fill="#fff"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
      <rect x="13" y="8" width="6" height="4" fill="#f5f5f5"/>
    `),
    ),
  },
  {
    id: 'doge',
    labelKey: 'sites.youtube.scrubber.doge',
    collection: 'memes',
    tags: ['doge', 'shiba', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#e8c170"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <ellipse cx="16" cy="21" rx="3" ry="2" fill="#fff"/>
    `),
    ),
  },
  {
    id: 'thisIsFine',
    labelKey: 'sites.youtube.scrubber.thisIsFine',
    collection: 'memes',
    tags: ['fine', 'fire', 'dog', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="8" y="12" width="16" height="14" fill="#d4a574"/>
      <rect x="10" y="14" width="4" height="3" fill="#222"/>
      <rect x="18" y="14" width="4" height="3" fill="#222"/>
      <rect x="4" y="4" width="4" height="8" fill="#f97316"/>
      <rect x="24" y="6" width="4" height="6" fill="#ef4444"/>
    `),
    ),
  },
  {
    id: 'dealWithIt',
    labelKey: 'sites.youtube.scrubber.dealWithIt',
    collection: 'memes',
    tags: ['deal', 'glasses', 'thug', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="6" y="10" width="20" height="14" fill="#fcd34d"/>
      <rect x="8" y="14" width="7" height="4" fill="#111"/>
      <rect x="17" y="14" width="7" height="4" fill="#111"/>
      <rect x="15" y="14" width="2" height="4" fill="#111"/>
    `),
    ),
  },
  {
    id: 'bongoCat',
    labelKey: 'sites.youtube.scrubber.bongoCat',
    collection: 'memes',
    tags: ['bongo', 'cat', 'meme'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="16" rx="10" ry="9" fill="#fff"/>
      <circle cx="12" cy="15" r="2" fill="#222"/>
      <circle cx="20" cy="15" r="2" fill="#222"/>
      <rect x="4" y="22" width="6" height="4" fill="#fff"/>
      <rect x="22" y="22" width="6" height="4" fill="#fff"/>
    `),
    ),
  },
  {
    id: 'mario',
    labelKey: 'sites.youtube.scrubber.mario',
    collection: 'games',
    tags: ['mario', 'nintendo', 'games'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="10" y="8" width="12" height="6" fill="#dc2626"/>
      <rect x="8" y="14" width="16" height="10" fill="#d4a574"/>
      <rect x="10" y="16" width="4" height="3" fill="#222"/>
      <rect x="18" y="16" width="4" height="3" fill="#222"/>
      <rect x="14" y="20" width="4" height="2" fill="#7f1d1d"/>
    `),
    ),
  },
  {
    id: 'mushroom',
    labelKey: 'sites.youtube.scrubber.mushroom',
    collection: 'games',
    tags: ['mario', 'mushroom', 'powerup'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="14" rx="10" ry="8" fill="#ef4444"/>
      <ellipse cx="16" cy="22" rx="6" ry="6" fill="#fde68a"/>
      <circle cx="12" cy="12" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="2" fill="#fff"/>
    `),
    ),
  },
  {
    id: 'star',
    labelKey: 'sites.youtube.scrubber.star',
    collection: 'games',
    tags: ['mario', 'star', 'invincible'],
    dataUri: svgDataUri(
      pixelSvg(`
      <polygon points="16,4 19,12 28,12 21,17 24,26 16,21 8,26 11,17 4,12 13,12" fill="#facc15"/>
    `),
    ),
  },
  {
    id: 'diamondSword',
    labelKey: 'sites.youtube.scrubber.diamondSword',
    collection: 'games',
    tags: ['minecraft', 'sword', 'diamond'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="14" y="4" width="4" height="14" fill="#22d3ee"/>
      <rect x="12" y="16" width="8" height="4" fill="#22d3ee"/>
      <rect x="10" y="20" width="12" height="2" fill="#78716c"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
    `),
    ),
  },
  {
    id: 'creeper',
    labelKey: 'sites.youtube.scrubber.creeper',
    collection: 'games',
    tags: ['minecraft', 'creeper'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="8" y="8" width="16" height="20" fill="#4ade80"/>
      <rect x="10" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="18" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="12" y="20" width="8" height="4" fill="#14532d"/>
    `),
    ),
  },
  {
    id: 'sonic',
    labelKey: 'sites.youtube.scrubber.sonic',
    collection: 'games',
    tags: ['sonic', 'sega', 'hedgehog'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="14" cy="18" rx="10" ry="8" fill="#2563eb"/>
      <ellipse cx="22" cy="14" rx="6" ry="5" fill="#2563eb"/>
      <circle cx="20" cy="13" r="2" fill="#fff"/>
      <circle cx="20" cy="13" r="1" fill="#222"/>
    `),
    ),
  },
  {
    id: 'pacman',
    labelKey: 'sites.youtube.scrubber.pacman',
    collection: 'games',
    tags: ['pacman', 'arcade'],
    dataUri: svgDataUri(
      pixelSvg(`
      <path d="M16 4 A12 12 0 1 1 16 28 L16 16 Z" fill="#facc15"/>
      <circle cx="22" cy="12" r="2" fill="#222"/>
    `),
    ),
  },
  {
    id: 'amongUs',
    labelKey: 'sites.youtube.scrubber.amongUs',
    collection: 'games',
    tags: ['among', 'us', 'crewmate'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="20" rx="9" ry="10" fill="#ef4444"/>
      <rect x="10" y="8" width="12" height="10" rx="4" fill="#ef4444"/>
      <ellipse cx="20" cy="12" rx="5" ry="4" fill="#7dd3fc"/>
      <rect x="12" y="14" width="8" height="4" fill="#1f2937"/>
    `),
    ),
  },
  {
    id: 'kirby',
    labelKey: 'sites.youtube.scrubber.kirby',
    collection: 'games',
    tags: ['kirby', 'nintendo'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="10" fill="#f472b6"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#222"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#222"/>
    `),
    ),
  },
  {
    id: 'pikachu',
    labelKey: 'sites.youtube.scrubber.pikachu',
    collection: 'games',
    tags: ['pokemon', 'pikachu'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#facc15"/>
      <polygon points="8,10 10,18 4,16" fill="#facc15"/>
      <polygon points="24,10 22,18 28,16" fill="#facc15"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <circle cx="16" cy="21" r="2" fill="#ef4444"/>
    `),
    ),
  },
  {
    id: 'bmo',
    labelKey: 'sites.youtube.scrubber.bmo',
    collection: 'cartoons',
    tags: ['adventure', 'time', 'bmo'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="8" y="10" width="16" height="16" rx="2" fill="#4ade80"/>
      <rect x="10" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="17" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="12" y="22" width="8" height="2" fill="#166534"/>
    `),
    ),
  },
  {
    id: 'jake',
    labelKey: 'sites.youtube.scrubber.jake',
    collection: 'cartoons',
    tags: ['adventure', 'time', 'jake', 'dog'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#fbbf24"/>
      <ellipse cx="8" cy="16" rx="4" ry="5" fill="#fbbf24"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
    `),
    ),
  },
  {
    id: 'pusheen',
    labelKey: 'sites.youtube.scrubber.pusheen',
    collection: 'cartoons',
    tags: ['pusheen', 'cat', 'cute'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#9ca3af"/>
      <rect x="8" y="10" width="4" height="4" fill="#9ca3af"/>
      <rect x="20" y="10" width="4" height="4" fill="#9ca3af"/>
      <circle cx="12" cy="17" r="1.5" fill="#222"/>
      <circle cx="20" cy="17" r="1.5" fill="#222"/>
    `),
    ),
  },
  {
    id: 'helloKitty',
    labelKey: 'sites.youtube.scrubber.helloKitty',
    collection: 'cartoons',
    tags: ['hello', 'kitty', 'sanrio'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="24" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <ellipse cx="24" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <circle cx="13" cy="17" r="1.5" fill="#222"/>
      <circle cx="19" cy="17" r="1.5" fill="#222"/>
    `),
    ),
  },
  {
    id: 'sponge',
    labelKey: 'sites.youtube.scrubber.sponge',
    collection: 'cartoons',
    tags: ['spongebob', 'cartoon'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="10" y="8" width="12" height="18" rx="2" fill="#facc15"/>
      <circle cx="14" cy="14" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="3" fill="#fff"/>
      <circle cx="20" cy="14" r="1.5" fill="#222"/>
      <rect x="12" y="20" width="8" height="2" fill="#7f1d1d"/>
    `),
    ),
  },
  {
    id: 'demonBlade',
    labelKey: 'sites.youtube.scrubber.demonBlade',
    collection: 'cartoons',
    tags: ['anime', 'demon', 'slayer', 'sword'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="15" y="4" width="2" height="18" fill="#e5e7eb"/>
      <rect x="12" y="20" width="8" height="3" fill="#1f2937"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
      <rect x="15" y="6" width="2" height="12" fill="#22d3ee"/>
    `),
    ),
  },
  {
    id: 'corgi',
    labelKey: 'sites.youtube.scrubber.corgi',
    collection: 'cute',
    tags: ['corgi', 'dog', 'cute'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="8" fill="#d97706"/>
      <ellipse cx="8" cy="14" rx="5" ry="6" fill="#d97706"/>
      <ellipse cx="24" cy="14" rx="5" ry="6" fill="#d97706"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `),
    ),
  },
  {
    id: 'shiba',
    labelKey: 'sites.youtube.scrubber.shiba',
    collection: 'cute',
    tags: ['shiba', 'inu', 'dog'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#f59e0b"/>
      <polygon points="8,12 10,20 4,18" fill="#f59e0b"/>
      <polygon points="24,12 22,20 28,18" fill="#f59e0b"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `),
    ),
  },
  {
    id: 'axolotl',
    labelKey: 'sites.youtube.scrubber.axolotl',
    collection: 'cute',
    tags: ['axolotl', 'animal'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="8" fill="#f9a8d4"/>
      <rect x="6" y="12" width="4" height="8" fill="#f472b6"/>
      <rect x="22" y="12" width="4" height="8" fill="#f472b6"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `),
    ),
  },
  {
    id: 'bee',
    labelKey: 'sites.youtube.scrubber.bee',
    collection: 'cute',
    tags: ['bee', 'cute'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="9" ry="7" fill="#facc15"/>
      <rect x="10" y="14" width="12" height="3" fill="#1f2937"/>
      <rect x="10" y="18" width="12" height="3" fill="#1f2937"/>
      <ellipse cx="22" cy="12" rx="4" ry="3" fill="#fff" opacity=".8"/>
    `),
    ),
  },
  {
    id: 'heart8bit',
    labelKey: 'sites.youtube.scrubber.heart8bit',
    collection: 'cute',
    tags: ['heart', '8bit', 'life'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="8" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="20" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="6" y="14" width="20" height="4" fill="#ef4444"/>
      <rect x="8" y="18" width="16" height="4" fill="#ef4444"/>
      <rect x="10" y="22" width="12" height="4" fill="#ef4444"/>
      <rect x="12" y="26" width="8" height="2" fill="#ef4444"/>
    `),
    ),
  },
  {
    id: 'money',
    labelKey: 'sites.youtube.scrubber.money',
    collection: 'cute',
    tags: ['money', 'cash', 'flying'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="6" y="12" width="20" height="12" rx="2" fill="#22c55e"/>
      <circle cx="16" cy="18" r="4" fill="#86efac"/>
      <text x="16" y="20" text-anchor="middle" font-size="6" fill="#14532d">$</text>
    `),
    ),
  },
  {
    id: 'lightsaberBlue',
    labelKey: 'sites.youtube.scrubber.lightsaberBlue',
    collection: 'scifi',
    tags: ['star', 'wars', 'lightsaber', 'jedi'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="14" y="4" width="4" height="20" fill="#38bdf8"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#e0f2fe"/>
    `),
    ),
  },
  {
    id: 'lightsaberRed',
    labelKey: 'sites.youtube.scrubber.lightsaberRed',
    collection: 'scifi',
    tags: ['star', 'wars', 'sith', 'lightsaber'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="14" y="4" width="4" height="20" fill="#ef4444"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#fecaca"/>
    `),
    ),
  },
  {
    id: 'batman',
    labelKey: 'sites.youtube.scrubber.batman',
    collection: 'scifi',
    tags: ['batman', 'dc', 'hero'],
    dataUri: svgDataUri(
      pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#1f2937"/>
      <path d="M10 14 L16 10 L22 14 L20 18 L12 18 Z" fill="#fbbf24"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#fff"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#fff"/>
    `),
    ),
  },
  {
    id: 'delorean',
    labelKey: 'sites.youtube.scrubber.delorean',
    collection: 'scifi',
    tags: ['back', 'future', 'car', 'delorean'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="6" y="16" width="20" height="8" rx="2" fill="#cbd5e1"/>
      <rect x="10" y="12" width="12" height="6" fill="#94a3b8"/>
      <rect x="8" y="22" width="4" height="4" fill="#1f2937"/>
      <rect x="20" y="22" width="4" height="4" fill="#1f2937"/>
    `),
    ),
  },
  {
    id: 'nimbus',
    labelKey: 'sites.youtube.scrubber.nimbus',
    collection: 'scifi',
    tags: ['harry', 'potter', 'broom'],
    dataUri: svgDataUri(
      pixelSvg(`
      <rect x="4" y="20" width="24" height="3" fill="#78350f"/>
      <rect x="20" y="8" width="3" height="14" fill="#78350f"/>
      <ellipse cx="22" cy="8" rx="6" ry="3" fill="#a16207"/>
    `),
    ),
  },
]

export function getScrubberAsset(id: string): ScrubberAssetDef | undefined {
  return SCRUBBER_ASSETS.find((a) => a.id === id)
}

export function getScrubbersByCollection(collection: ScrubberCollectionId): ScrubberAssetDef[] {
  return SCRUBBER_ASSETS.filter((a) => a.collection === collection)
}
