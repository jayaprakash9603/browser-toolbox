import { toolRegistry } from '@/core/registry'
import type { Rgb } from '@/core/engines/color'
import { rgbToHex } from '@/core/engines/color'

export function useDesignTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export function Swatch({ color, size = 'md' }: { color: Rgb; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 'size-5' : size === 'lg' ? 'size-10' : 'size-7'
  return (
    <span
      className={`inline-block ${px} rounded border border-black/10 dark:border-white/10`}
      style={{ backgroundColor: rgbToHex(color) }}
      aria-label={rgbToHex(color)}
    />
  )
}
