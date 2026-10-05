import { CodeFormatterTool } from '../_CodeFormatterTool'
import { formatCss, minifyCss } from './logic'

export default function CssFormatterTool() {
  return (
    <CodeFormatterTool
      toolId="text.css-formatter"
      format={formatCss}
      minify={minifyCss}
      placeholder=".class{color:red}"
      errorMessage="Unable to format this CSS."
    />
  )
}
