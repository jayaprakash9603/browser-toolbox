import { QrCodeIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const generatorsTools = [
  defineTool({
    id: 'generators.qr-toolkit',
    name: 'QR Code Toolkit',
    description:
      'Generate styled QR codes and linear barcodes (EAN, UPC, Code 128/39), customize colors and logos, and decode QR images.',
    category: 'generators',
    icon: QrCodeIcon,
    keywords: ['qr', 'qrcode', 'qr code', 'wifi', 'barcode', 'generate', 'decode', 'scan'],
    aliases: ['qr code', 'qr generator', 'qr code generator', 'wifi qr', 'qr decoder', 'scan qr'],
    route: '/tools/generators/qr-toolkit',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    dependencies: ['qrcode'],
    status: 'active',
    loader: () => import('@/tools/generators/qr-toolkit/Tool'),
  }),
]
