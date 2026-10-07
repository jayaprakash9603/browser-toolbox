import { BinaryIcon, CalculatorIcon, ArrowLeftRightIcon } from 'lucide-react'

import type { ToolDefinition } from '@/core/registry'

export const calculatorsTools: ToolDefinition[] = [
  {
    id: 'calculators.calculator',
    name: 'Calculator',
    description: 'Arithmetic and scientific calculator with history (no eval).',
    category: 'calculators',
    icon: CalculatorIcon,
    keywords: ['calculator', 'math', 'arithmetic', 'scientific', 'percent', 'sqrt'],
    aliases: ['calculator', 'calc', 'math', 'scientific calculator', 'percentage'],
    route: '/tools/calculators/calculator',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/calculators/calculator/Tool'),
  },
  {
    id: 'calculators.unit-converter',
    name: 'Unit Converter',
    description: 'Convert length, weight, temperature, data, speed and more.',
    category: 'calculators',
    icon: ArrowLeftRightIcon,
    keywords: ['unit', 'convert', 'length', 'weight', 'temperature', 'data', 'speed', 'volume'],
    aliases: ['unit converter', 'convert units', 'kg to lb', 'km to miles', 'celsius to fahrenheit', 'mb to gb'],
    route: '/tools/calculators/unit-converter',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/calculators/unit-converter/Tool'),
  },
  {
    id: 'calculators.base-converter',
    name: 'Number Base Converter',
    description: 'Convert between binary, octal, decimal and hexadecimal with bit view.',
    category: 'calculators',
    icon: BinaryIcon,
    keywords: ['base', 'binary', 'octal', 'decimal', 'hexadecimal', 'hex', 'bits'],
    aliases: ['base converter', 'binary converter', 'hex to decimal', 'decimal to binary', 'number base'],
    route: '/tools/calculators/base-converter',
    capabilities: ['SIDE_PANEL', 'COMMAND'],
    status: 'active',
    loader: () => import('@/tools/calculators/base-converter/Tool'),
  },
]
