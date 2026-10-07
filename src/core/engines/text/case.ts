export type CaseStyle =
  'lower' | 'upper' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant'

export const CASE_STYLES: { id: CaseStyle; label: string; example: string }[] = [
  { id: 'lower', label: 'lowercase', example: 'hello world' },
  { id: 'upper', label: 'UPPERCASE', example: 'HELLO WORLD' },
  { id: 'title', label: 'Title Case', example: 'Hello World' },
  { id: 'sentence', label: 'Sentence case', example: 'Hello world' },
  { id: 'camel', label: 'camelCase', example: 'helloWorld' },
  { id: 'pascal', label: 'PascalCase', example: 'HelloWorld' },
  { id: 'snake', label: 'snake_case', example: 'hello_world' },
  { id: 'kebab', label: 'kebab-case', example: 'hello-world' },
  { id: 'constant', label: 'CONSTANT_CASE', example: 'HELLO_WORLD' },
]

export function splitWords(input: string): string[] {
  return input
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/[^a-zA-Z\d\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase())
}

export function convertCase(input: string, style: CaseStyle): string {
  if (style === 'lower') return input.toLowerCase()
  if (style === 'upper') return input.toUpperCase()
  if (style === 'title') {
    return input.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
  }
  if (style === 'sentence') {
    return input.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase())
  }

  const words = splitWords(input)
  switch (style) {
    case 'camel':
      return words
        .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
        .join('')
    case 'pascal':
      return words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')
    case 'snake':
      return words.join('_')
    case 'kebab':
      return words.join('-')
    case 'constant':
      return words.join('_').toUpperCase()
  }
}
