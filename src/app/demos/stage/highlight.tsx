import type { ReactNode } from 'react'

const TOKEN =
  /("(?:[^"\\]|\\.)*"(?=\s*:))|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b-?\d+(?:\.\d+)?\b)|(\b(?:true|false|null|undefined)\b)|(\b(?:SELECT|FROM|WHERE|JOIN|LEFT|ON|AND|OR|ORDER|BY|GROUP|LIMIT|AS|INSERT|INTO|VALUES|UPDATE|SET|const|let|function|return|import|export|from|await|async|new|if|else)\b)|(<\/?[\w:-]+|\/?>)|([{}[\](),:;=])/g

const TOKEN_CLASS = [
  '',
  'text-[var(--accent)]',
  'text-emerald',
  'text-amber',
  'text-rose',
  'text-violet',
  'text-cyan',
  'text-muted',
]

/** Tiny syntax colouring for JSON, JS, SQL and markup samples. */
export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) out.push(code.slice(last, index))
    const group = match.slice(1).findIndex(Boolean) + 1
    out.push(
      <span key={key++} className={TOKEN_CLASS[group]}>
        {match[0]}
      </span>,
    )
    last = index + match[0].length
  }
  if (last < code.length) out.push(code.slice(last))
  return out
}
