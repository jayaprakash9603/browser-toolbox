import { DownloadIcon, ImageIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const imageTools = [
  defineTool({
    id: 'image.save-as-type',
    name: 'Save Image As Type',
    description: 'Right-click any image and save as JPG, PNG, WebP, GIF, or PDF — converted locally.',
    category: 'image',
    icon: DownloadIcon,
    keywords: ['save image', 'download image', 'jpg', 'png', 'pdf', 'webp', 'gif', 'convert', 'context menu'],
    aliases: ['save image as type', 'image format converter', 'save as jpg', 'save as png'],
    route: '/tools/image/save-as-type',
    capabilities: ['CONTEXT_MENU'],
    status: 'active',
    loader: () => import('@/tools/image/save-as-type/Tool'),
  }),
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
