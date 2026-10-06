import { cssFormatter } from './css/formatter'
import { htmlFormatter } from './html/formatter'
import { javascriptFormatter } from './javascript/formatter'
import { jsonFormatter } from './json/formatter'
import { markdownFormatter } from './markdown/formatter'
import { plainTextFormatter } from './plain-text/formatter'
import { typescriptFormatter } from './typescript/formatter'
import { xmlFormatter } from './xml/formatter'

export const textFormatterStrategies = [
  jsonFormatter,
  xmlFormatter,
  htmlFormatter,
  markdownFormatter,
  typescriptFormatter,
  javascriptFormatter,
  cssFormatter,
  plainTextFormatter,
] as const
