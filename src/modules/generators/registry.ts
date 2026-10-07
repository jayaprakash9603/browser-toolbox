import { QrCodeIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const generatorsTools: ToolDefinition[] = [
  {
    id: 'generators.qr-toolkit',
    name: 'QR Code Toolkit',
    description: 'Generate QR codes for text, URLs, Wi-Fi, email, phone and contacts; decode from images.',
    category: 'generators',
    icon: QrCodeIcon,
    keywords: ['qr', 'qrcode', 'qr code', 'wifi', 'barcode', 'generate', 'decode', 'scan'],
    aliases: ['qr code', 'qr generator', 'qr code generator', 'wifi qr', 'qr decoder', 'scan qr'],
    route: '/tools/generators/qr-toolkit',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/generators/qr-toolkit/Tool'),
  },
]
