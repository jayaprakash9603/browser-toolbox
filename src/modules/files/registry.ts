import { FolderOpenIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const filesTools = [
  defineTool({
    id: 'files.file-toolkit',
    name: 'File Toolkit',
    description: 'View CSV/JSON/text files and combine images into a PDF — all locally.',
    category: 'files',
    icon: FolderOpenIcon,
    keywords: ['file', 'csv', 'json', 'text', 'pdf', 'image', 'convert', 'viewer'],
    aliases: ['csv viewer', 'json viewer', 'image to pdf', 'text viewer', 'file viewer'],
    route: '/tools/files/file-toolkit',
    capabilities: ['SIDE_PANEL'],
    status: 'active',
    loader: () => import('@/tools/files/file-toolkit/Tool'),
  }),
]
