import { CodeFormatterTool } from '../_CodeFormatterTool'
import { formatHtml, minifyHtml } from './logic'

export default function HtmlFormatterTool() {
  return (
    <CodeFormatterTool
      toolId="text.html-formatter"
      format={formatHtml}
      minify={minifyHtml}
      placeholder="<!doctype html><html>…"
      errorMessageKey="errors.formatHtml"
    />
  )
}
