import { BinaryIcon, ArrowLeftRightIcon } from 'lucide-react'

import { defineTool } from '@/core/registry'

export const calculatorsTools = [
  defineTool({
    id: 'calculators.unit-converter',
    name: 'Unit Converter',
    description: 'Convert length, weight, temperature, data, speed and more.',
    category: 'calculators',
    icon: ArrowLeftRightIcon,
    keywords: ['unit', 'convert', 'length', 'weight', 'temperature', 'data', 'speed', 'volume'],
    aliases: [
      'unit converter',
      'convert units',
      'kg to lb',
      'km to miles',
      'celsius to fahrenheit',
      'mb to gb',
    ],
    route: '/tools/calculators/unit-converter',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    dependencies: ['unit'],
    status: 'active',
    loader: () => import('@/tools/calculators/unit-converter/Tool'),
  }),
  defineTool({
    id: 'calculators.base-converter',
    name: 'Number Base Converter',
    description: 'Convert between binary, octal, decimal and hexadecimal with bit view.',
    category: 'calculators',
    icon: BinaryIcon,
    keywords: ['base', 'binary', 'octal', 'decimal', 'hexadecimal', 'hex', 'bits'],
    aliases: [
      'base converter',
      'binary converter',
      'hex to decimal',
      'decimal to binary',
      'number base',
    ],
    route: '/tools/calculators/base-converter',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    dependencies: ['base'],
    status: 'active',
    loader: () => import('@/tools/calculators/base-converter/Tool'),
  }),
]
