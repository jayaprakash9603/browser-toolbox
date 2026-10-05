import { CodeFormatterTool } from '../_CodeFormatterTool'
import { formatJs, minifyJs } from './logic'

export default function JavaScriptFormatterTool() {
  return (
    <CodeFormatterTool
      toolId="text.javascript-formatter"
      format={formatJs}
      minify={minifyJs}
      placeholder="const x={a:1,b:2}"
      errorMessageKey="errors.formatJavaScript"
    />
  )
}
