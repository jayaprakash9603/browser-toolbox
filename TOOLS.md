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
| Formatter | `/tools/text/formatter` | Auto-detect + format/minify: JSON, JS, TS, HTML, XML, CSS, Markdown, plain text |
| Case Converter | `/tools/text/case-converter` | lower/UPPER/Title/Sentence/camel/Pascal/snake/kebab/CONSTANT |
| Text Cleaner | `/tools/text/whitespace-cleaner` | Trim, collapse spaces, normalize breaks, strip blank lines |
| Text Analyzer | `/tools/text/analyzer` | Words, chars (±spaces), lines, paragraphs, sentences, reading time, averages |
| Line Tools | `/tools/text/line-tools` | Dedupe, sort, reverse, shuffle, line numbering, remove empty lines |
| Find & Replace | `/tools/text/find-replace` | Live match count, case/whole-word/regex, `$1` groups |
| Text Diff | `/tools/text/diff` | Line diff via `diff` package, +/- badges |
| Dummy Data | `/tools/text/dummy-data` | Lorem ipsum or random paragraphs / sentences / words |

Legacy routes (`word-counter`, `line-counter`, `duplicate-line-remover`, `sort-lines`, `lorem-ipsum`, old formatter routes) redirect to the consolidated tools.

## Developer

| Tool | Route | Highlights |
| --- | --- | --- |
| JSON Toolkit | `/tools/developer/json-toolkit` | Validate (line/col/fix), format, minify, tree view, JSON-path query, convert to CSV/XML/TypeScript/Markdown |
| XML Toolkit | `/tools/developer/xml-toolkit` | Validate with position, format, minify, XML → JSON |
| YAML Toolkit | `/tools/developer/yaml-toolkit` | Validate, format, YAML ↔ JSON |
| SQL Toolkit | `/tools/developer/sql-toolkit` | Format + minify across 10 dialects (sql-formatter) |
| Regex Toolkit | `/tools/developer/regex-toolkit` | Test with match/groups, replace with `$1`, pattern library, backtracking risk warnings |
| UUID / ID Toolkit | `/tools/developer/id-toolkit` | UUID v4/v7, NanoID, bulk generate, validate |
| Timestamp Toolkit | `/tools/developer/timestamp-toolkit` | Unix s/ms ↔ date, current timestamp, relative time |

All Developer tools reuse the shared engines in `src/core/engines/` (`json`, `xml`, `yaml`, `sql`, `regex`, `id`, `date`).

## QA

| Tool | Route | Highlights |
| --- | --- | --- |
| Element Inspector | `/tools/qa/element-inspector` | Pick an element → tag, id, classes, attributes, text, dimensions, computed styles |
| Selector Generator | `/tools/qa/selector-generator` | CSS + XPath (id/class/attr/relative/absolute/text) with copy |
| XPath Tester | `/tools/qa/xpath-tester` | Evaluate XPath on the live page, match count + samples |
| Test Data Generator | `/tools/qa/test-data-generator` | Names, emails, phones, addresses, UUIDs, dates, numbers → JSON/CSV |
| HTTP Status Codes | `/tools/qa/http-status` | Searchable status-code lookup with debugging hints |
| Bug Reporter | `/tools/qa/bug-reporter` | Captures URL/title/viewport/UA + Expected/Actual/Steps → markdown |

Element tools share the single element-picker + `selector` engine (no duplicate selection logic).

## Web

| Tool | Route | Highlights |
| --- | --- | --- |
| URL Toolkit | `/tools/web/url-toolkit` | Parse, encode/decode, query-param editor, tracking-param cleaner |
| Link Toolkit | `/tools/web/link-toolkit` | Extract internal/external links, dupes, copy URLs |
| Image Links | `/tools/web/image-links` | Extract image URLs, dimensions, alt text |
| Page Information | `/tools/web/page-info` | Title, meta, canonical, Open Graph, Twitter cards |

## Security

| Tool | Route | Highlights |
| --- | --- | --- |
| Encoder / Decoder | `/tools/security/encoder-decoder` | Base64, URL, HTML, Unicode, Hex (encode + decode) |
| Hash Toolkit | `/tools/security/hash-toolkit` | SHA-1/256/384/512 + MD5 (legacy) + HMAC via Web Crypto |
| JWT Toolkit | `/tools/security/jwt-toolkit` | Decode header/payload/claims, expiry status; decode ≠ verify |
| Password Generator | `/tools/security/password-generator` | Crypto-random, charset options, bulk, ambiguous-char exclusion |
| Random Generator | `/tools/security/random-generator` | Numbers, strings, hex, UUID, NanoID (crypto) |

## Design

| Tool | Route | Highlights |
| --- | --- | --- |
| Color Converter | `/tools/design/color-converter` | HEX ↔ RGB ↔ HSL ↔ HSV ↔ HWB ↔ CMYK |
| Color Picker | `/tools/design/color-picker` | Screen eyedropper + swatch, copy HEX/RGB/HSL |
| Palette Generator | `/tools/design/palette-generator` | Complementary/analogous/triadic/monochromatic/random, CSS export |
| Contrast Checker | `/tools/design/contrast-checker` | WCAG AA/AAA, normal + large text, live preview |
| CSS Generator | `/tools/design/css-generator` | Gradient, box-shadow, border-radius, glass effect |

## Screenshots

| Tool | Route | Highlights |
| --- | --- | --- |
| Capture Toolkit | `/tools/screenshots/capture` | Visible-tab capture + annotation (rect/circle/arrow/highlight/blur/marker/text), download PNG |

## Calculators

| Tool | Route | Highlights |
| --- | --- | --- |
| Calculator | `/tools/calculators/calculator` | Arithmetic + scientific, safe tokenizer (no eval), history |
| Unit Converter | `/tools/calculators/unit-converter` | 13 categories (length, weight, temperature, data, speed…) |
| Number Base Converter | `/tools/calculators/base-converter` | Binary/octal/decimal/hex + bit view (BigInt) |

## Date & Time

| Tool | Route | Highlights |
| --- | --- | --- |
| Date & Time Toolkit | `/tools/datetime/toolkit` | Date diff, working days, add days, timezone converter, cron parser + explainer |

## Image

| Tool | Route | Highlights |
| --- | --- | --- |
| Image Toolkit | `/tools/image/image-toolkit` | Resize, crop, convert (PNG/JPEG/WebP), info, Base64 — all local |

## Files

| Tool | Route | Highlights |
| --- | --- | --- |
| File Toolkit | `/tools/files/file-toolkit` | CSV/JSON/text viewers + images → PDF (jspdf, lazy) |

## Generators

| Tool | Route | Highlights |
| --- | --- | --- |
| QR Code Toolkit | `/tools/generators/qr-toolkit` | Text/URL/Wi-Fi/email/phone/contact QR + decode from image |

## SEO

| Tool | Route | Highlights |
| --- | --- | --- |
| SEO Toolkit | `/tools/seo/toolkit` | Score, meta/OG checks, heading hierarchy, link & image analysis |

## Productivity

| Tool | Route | Highlights |
| --- | --- | --- |
| Notes | `/tools/productivity/notes` | Local markdown notes, search, pin |
| Timer | `/tools/productivity/timer` | Countdown, stopwatch, Pomodoro |
| Tab Manager | `/tools/productivity/tab-manager` | Search tabs, close duplicates, copy URLs |

## Browser

| Tool | Route | Highlights |
| --- | --- | --- |
| Browser Toolkit | `/tools/browser/toolkit` | Copy URL/title, reload, hard-reload, duplicate tab |

## Storage

| Tool | Route | Highlights |
| --- | --- | --- |
| Storage Inspector | `/tools/storage/inspector` | localStorage + sessionStorage, search, copy |

## Accessibility

| Tool | Route | Highlights |
| --- | --- | --- |
| Accessibility Quick Check | `/tools/accessibility/toolkit` | Alt text, headings, link names, lang; links to Contrast Checker |

## Engines

Pure, unit-tested logic lives in `src/core/engines/` (`text`, `diff`, `json`, `encoding`, `url`, `color`, `date`, `hash`, `jwt`, `regex`, `unit`, `base`, `id`, `password`, `xml`, `yaml`, `sql`, `csv`, `qrcode`, `timezone`, `detection`, `selector`, `capture`, `image`, `calc`, `seo`, `testdata`). Tool UIs and all surfaces (context menu, commands, DevTools) call these engines — no duplicated logic.
