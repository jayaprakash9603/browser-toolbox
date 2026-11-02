import { getSearchMatchIndices } from '@/shared/lib/searchMatching'

interface HighlightedTextProps {
  text: string
  query: string
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const indices = getSearchMatchIndices(text, query)
  if (indices.length === 0) return <>{text}</>

  const indexSet = new Set(indices)
  const parts: { text: string; highlighted: boolean }[] = []
  let current = ''
  let highlighted = indexSet.has(0)

  for (let index = 0; index < text.length; index++) {
    const nextHighlighted = indexSet.has(index)
    if (nextHighlighted !== highlighted) {
      if (current) parts.push({ text: current, highlighted })
      current = text[index]
      highlighted = nextHighlighted
    } else {
      current += text[index]
    }
  }
  if (current) parts.push({ text: current, highlighted })

  return (
    <span className="inline min-w-0 truncate align-baseline leading-[inherit]">
      {parts.map((part, index) =>
        part.highlighted ? (
          <span key={index} data-search-highlight className="font-semibold text-primary">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  )
}
