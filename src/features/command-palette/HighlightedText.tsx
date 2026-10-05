interface HighlightedTextProps {
  text: string
  query: string
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const indices = getMatchIndices(text, query)
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
          <span key={index} data-search-highlight className="font-semibold text-sky-500 dark:text-sky-400">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  )
}

function getMatchIndices(text: string, query: string): number[] {
  const searchableText = text.toLowerCase()
  const searchableQuery = query.trim().toLowerCase()

  for (let length = searchableQuery.length; length > 0; length--) {
    const candidate = searchableQuery.slice(0, length)
    const start = searchableText.indexOf(candidate)
    if (start >= 0) {
      return Array.from({ length: candidate.length }, (_, offset) => start + offset)
    }

    const indices: number[] = []
    let textIndex = 0
    for (const character of candidate) {
      const matchIndex = searchableText.indexOf(character, textIndex)
      if (matchIndex < 0) break
      indices.push(matchIndex)
      textIndex = matchIndex + 1
    }
    if (indices.length === candidate.length) return indices
  }

  return []
}