import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TOOLS, type ToolInfo } from './toolList'

/** Tools whose name, description, category or aliases contain every word of the query, best matches first. */
export function useToolSearch(query: string): ToolInfo[] {
  const { t } = useTranslation()
  return useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (!words.length) return TOOLS
    return TOOLS.map((tool) => {
      const name = `${t(`pdf.tools.${tool.id}.name`)} ${tool.name}`.toLowerCase()
      const haystack = `${name} ${t(`pdf.tools.${tool.id}.desc`)} ${t(`pdf.cat.${tool.category}`)} ${tool.aliases.join(' ')} ${tool.id}`.toLowerCase()
      if (!words.every((word) => haystack.includes(word))) return null
      const score = words.reduce((sum, word) => sum + (name.startsWith(word) ? 3 : name.includes(word) ? 2 : 1), 0)
      return { tool, score }
    })
      .filter((entry): entry is { tool: ToolInfo; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score)
      .map(({ tool }) => tool)
  }, [query, t])
}
