function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]#])/g, '\\$1')
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const inner = () => [...el.childNodes].map(nodeToMd).join('').trim()

  switch (tag) {
    case 'br':
      return '\n'
    case 'p':
      return `${inner()}\n\n`
    case 'h1':
      return `# ${inner()}\n\n`
    case 'h2':
      return `## ${inner()}\n\n`
    case 'h3':
      return `### ${inner()}\n\n`
    case 'h4':
      return `#### ${inner()}\n\n`
    case 'strong':
    case 'b':
      return `**${inner()}**`
    case 'em':
    case 'i':
      return `*${inner()}*`
    case 'code':
      return `\`${inner()}\``
    case 'pre':
      return `\n\`\`\`\n${el.textContent ?? ''}\n\`\`\`\n\n`
    case 'a': {
      const href = el.getAttribute('href') ?? ''
      const label = inner() || href
      return href ? `[${escapeMd(label)}](${href})` : label
    }
    case 'li':
      return `- ${inner()}\n`
    case 'ul':
    case 'ol':
      return `${inner()}\n`
    case 'img': {
      const alt = el.getAttribute('alt') ?? 'image'
      const src = el.getAttribute('src') ?? ''
      return src ? `![${escapeMd(alt)}](${src})\n\n` : ''
    }
    default:
      return inner()
  }
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const body = doc.body
  const md = [...body.childNodes].map(nodeToMd).join('').trim()
  return md.replace(/\n{3,}/g, '\n\n')
}

export function selectionHtmlToMarkdown(): string | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  const fragment = range.cloneContents()
  const div = document.createElement('div')
  div.appendChild(fragment)
  return htmlToMarkdown(div.innerHTML)
}

export function articleHtmlToMarkdown(): string {
  const article = document.querySelector('article') ?? document.body
  return htmlToMarkdown(article.innerHTML)
}
