import { ImageIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const imageTools = [
  defineTool({
    id: 'image.image-toolkit',
    name: 'Image Toolkit',
    description: 'Resize, crop, convert, inspect and encode images locally.',
    category: 'image',
    icon: ImageIcon,
    keywords: ['image', 'resize', 'crop', 'convert', 'png', 'jpg', 'webp', 'base64', 'metadata'],
    aliases: [
      'image resize',
      'image converter',
      'image to base64',
      'compress image',
      'crop image',
      'png to jpg',
    ],
    route: '/tools/image/image-toolkit',
    capabilities: ['SIDE_PANEL'],
    dependencies: ['image'],
    status: 'active',
    loader: () => import('@/tools/image/image-toolkit/Tool'),
  }),
]
