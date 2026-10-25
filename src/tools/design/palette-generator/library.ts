export const LIBRARY_TAGS = [
  'product',
  'theme',
  'dark',
  'light',
  'pastel',
  'vibrant',
  'earthy',
  'nature',
  'retro',
  'luxury',
  'minimal',
] as const
export type LibraryTag = (typeof LIBRARY_TAGS)[number]

export interface LibraryPalette {
  id: string
  /** Proper names of well-known themes or descriptive names; shown as-is. */
  name: string
  tags: readonly LibraryTag[]
  colors: readonly string[]
}

export const LIBRARY: readonly LibraryPalette[] = [
  { id: 'indigo-saas', name: 'Indigo SaaS', tags: ['product', 'light'], colors: ['#4f46e5', '#818cf8', '#0ea5e9', '#f8fafc', '#0f172a'] },
  { id: 'fintech-trust', name: 'Fintech Trust', tags: ['product', 'light'], colors: ['#0b3d91', '#1e88e5', '#00c853', '#f5f7fa', '#102a43'] },
  { id: 'health-calm', name: 'Health Calm', tags: ['product', 'light', 'nature'], colors: ['#0f766e', '#14b8a6', '#99f6e4', '#f0fdfa', '#134e4a'] },
  { id: 'analytics', name: 'Analytics Dashboard', tags: ['product', 'vibrant'], colors: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9'] },
  { id: 'startup-coral', name: 'Startup Coral', tags: ['product', 'vibrant'], colors: ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#222f3e'] },
  { id: 'corporate-blue', name: 'Corporate Blue', tags: ['product'], colors: ['#00296b', '#003f88', '#00509d', '#fdc500', '#ffd500'] },
  { id: 'commerce-pop', name: 'Commerce Pop', tags: ['product', 'vibrant'], colors: ['#ff3d68', '#ffb03b', '#2ec4b6', '#011627', '#fdfffc'] },
  { id: 'minimal-mono', name: 'Minimal Mono', tags: ['minimal', 'light'], colors: ['#111827', '#374151', '#9ca3af', '#e5e7eb', '#f9fafb'] },
  { id: 'nord', name: 'Nord', tags: ['theme', 'dark'], colors: ['#2e3440', '#4c566a', '#88c0d0', '#5e81ac', '#eceff4'] },
  { id: 'dracula', name: 'Dracula', tags: ['theme', 'dark', 'vibrant'], colors: ['#282a36', '#44475a', '#bd93f9', '#ff79c6', '#50fa7b'] },
  { id: 'solarized', name: 'Solarized', tags: ['theme', 'dark', 'retro'], colors: ['#002b36', '#268bd2', '#2aa198', '#b58900', '#fdf6e3'] },
  { id: 'catppuccin', name: 'Catppuccin Mocha', tags: ['theme', 'dark', 'pastel'], colors: ['#1e1e2e', '#cba6f7', '#f38ba8', '#a6e3a1', '#89b4fa'] },
  { id: 'gruvbox', name: 'Gruvbox', tags: ['theme', 'dark', 'retro', 'earthy'], colors: ['#282828', '#cc241d', '#d79921', '#98971a', '#ebdbb2'] },
  { id: 'tokyo-night', name: 'Tokyo Night', tags: ['theme', 'dark'], colors: ['#1a1b26', '#7aa2f7', '#bb9af7', '#7dcfff', '#9ece6a'] },
  { id: 'one-dark', name: 'One Dark', tags: ['theme', 'dark'], colors: ['#282c34', '#61afef', '#c678dd', '#98c379', '#e06c75'] },
  { id: 'rose-pine', name: 'Rosé Pine', tags: ['theme', 'dark', 'pastel'], colors: ['#191724', '#ebbcba', '#31748f', '#9ccfd8', '#c4a7e7'] },
  { id: 'ocean-breeze', name: 'Ocean Breeze', tags: ['nature', 'light'], colors: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { id: 'sunset-glow', name: 'Sunset Glow', tags: ['vibrant'], colors: ['#ff7b00', '#ff9500', '#ffb700', '#ff5d8f', '#6a4c93'] },
  { id: 'forest-walk', name: 'Forest Walk', tags: ['nature', 'earthy'], colors: ['#283618', '#606c38', '#dda15e', '#bc6c25', '#fefae0'] },
  { id: 'desert-sand', name: 'Desert Sand', tags: ['earthy', 'light'], colors: ['#edc9af', '#d4a373', '#a47148', '#6f4518', '#fefae0'] },
  { id: 'pastel-dream', name: 'Pastel Dream', tags: ['pastel', 'light'], colors: ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff'] },
  { id: 'neon-night', name: 'Neon Night', tags: ['vibrant', 'dark'], colors: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'] },
  { id: 'coffee-house', name: 'Coffee House', tags: ['earthy', 'minimal'], colors: ['#3e2723', '#6d4c41', '#a1887f', '#d7ccc8', '#efebe9'] },
  { id: 'berry-smoothie', name: 'Berry Smoothie', tags: ['vibrant'], colors: ['#590d22', '#a4133c', '#ff4d6d', '#ff8fa3', '#fff0f3'] },
  { id: 'luxury-gold', name: 'Luxury Gold', tags: ['luxury', 'dark'], colors: ['#0d0d0d', '#1c1c1c', '#c9a227', '#e6c870', '#f5f0e1'] },
  { id: 'retro-pop', name: 'Retro Pop', tags: ['retro', 'vibrant'], colors: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'] },
  { id: 'vintage-film', name: 'Vintage Film', tags: ['retro', 'earthy'], colors: ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'] },
  { id: 'nordic-frost', name: 'Nordic Frost', tags: ['minimal', 'light'], colors: ['#e0fbfc', '#c2dfe3', '#9db4c0', '#5c6b73', '#253237'] },
  { id: 'sakura', name: 'Sakura', tags: ['pastel', 'nature'], colors: ['#fff1f2', '#fecdd3', '#fb7185', '#be123c', '#4c0519'] },
  { id: 'mint-fresh', name: 'Mint Fresh', tags: ['nature', 'light'], colors: ['#d8f3dc', '#95d5b2', '#52b788', '#2d6a4f', '#081c15'] },
  { id: 'lavender-fields', name: 'Lavender Fields', tags: ['pastel', 'luxury'], colors: ['#f3e8ff', '#d8b4fe', '#a855f7', '#6b21a8', '#2e1065'] },
  { id: 'cyberpunk', name: 'Cyberpunk', tags: ['vibrant', 'dark'], colors: ['#fcee0a', '#ff003c', '#00f0ff', '#711c91', '#0d0221'] },
  { id: 'autumn-leaves', name: 'Autumn Leaves', tags: ['earthy', 'nature'], colors: ['#7f5539', '#9c6644', '#b08968', '#ddb892', '#ede0d4'] },
  { id: 'aurora', name: 'Aurora', tags: ['dark', 'nature'], colors: ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#6fffe9'] },
  { id: 'citrus-burst', name: 'Citrus Burst', tags: ['vibrant'], colors: ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'] },
  { id: 'midnight-ink', name: 'Midnight Ink', tags: ['dark', 'minimal'], colors: ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd'] },
  { id: 'terracotta', name: 'Terracotta', tags: ['earthy', 'luxury'], colors: ['#6b2d1c', '#b5543a', '#e07a5f', '#f2cc8f', '#f4f1de'] },
  { id: 'arctic-lake', name: 'Arctic Lake', tags: ['light', 'nature'], colors: ['#edf6f9', '#83c5be', '#006d77', '#ffddd2', '#e29578'] },
]
