# Tools

## Clipboard

| Tool | Route | Notes |
| --- | --- | --- |
| Clipboard Manager | `/tools/clipboard/manager` | Tabs (All/Text/Pinned), search, pin, delete, clear |
| Clipboard History | `/tools/clipboard/history` | Auto-capture on panel focus + paste + explicit add |
| Pinned Items | `/tools/clipboard/pinned` | Pinned snippets survive history trimming |
| Clipboard Search | `/tools/clipboard/search` | Full-text search over history |

Chrome cannot passively watch the clipboard from a side panel. Capture happens on: panel focus, paste events, and the explicit "Add current clipboard" button. All data is local; history can be disabled, size-limited and cleared from Settings.

## Text

| Tool | Route | Highlights |
| --- | --- | --- |
| Text Formatter | `/tools/text/formatter` | Trim, collapse spaces, normalize breaks, strip blank lines |
| Case Converter | `/tools/text/case-converter` | lower/UPPER/Title/Sentence/camel/Pascal/snake/kebab/CONSTANT |
| Whitespace Cleaner | `/tools/text/whitespace-cleaner` | Togglable options, non-destructive preview |
| Duplicate Line Remover | `/tools/text/duplicate-line-remover` | Order-preserving, case/trim options, removal count |
| Sort Lines | `/tools/text/sort-lines` | Alpha, numeric, length; asc/desc; case toggle |
| Line Counter | `/tools/text/line-counter` | Total / non-blank / blank |
| Word Counter | `/tools/text/word-counter` | Words, chars (±spaces), lines, paragraphs, sentences, reading time |
| Find & Replace | `/tools/text/find-replace` | Live match count, case/whole-word/regex, `$1` groups |
| Text Diff | `/tools/text/diff` | Line diff via `diff` package, +/- badges |
| Lorem Ipsum | `/tools/text/lorem-ipsum` | Paragraphs / sentences / words |
| Markdown Formatter | `/tools/text/markdown-formatter` | Heading/list/spacing normalization, code-block safe |
| HTML Formatter | `/tools/text/html-formatter` | js-beautify + conservative minifier |
| CSS Formatter | `/tools/text/css-formatter` | js-beautify + conservative minifier |
| JavaScript Formatter | `/tools/text/javascript-formatter` | js-beautify; minifier strips comments/blank lines only |

## Coming soon

Developer · QA · Web · Design · Security · Calculators · Screenshots · Files · Productivity — categories are pre-registered; see ARCHITECTURE.md for the extension points (context menus, content scripts, DevTools bridge, command system).
