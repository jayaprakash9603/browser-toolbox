const IMAGES = [
  'linear-gradient(135deg,#f472b6,#8b5cf6)',
  'linear-gradient(135deg,#22d3ee,#6366f1)',
  'linear-gradient(135deg,#fbbf24,#fb7185)',
  'linear-gradient(135deg,#34d399,#0ea5e9)',
  'linear-gradient(135deg,#a78bfa,#f472b6)',
  'linear-gradient(135deg,#fb923c,#facc15)',
]

export const mockImage = (index: number) => IMAGES[index % IMAGES.length]
