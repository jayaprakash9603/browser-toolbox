# Tools catalog & capability matrix

One Panel ships **55 registry tools** (including one disabled legacy entry) as **consolidated toolkits**, not hundreds of separate icons. Search, favorites, the command palette (`Ctrl/Cmd+Shift+Space`), context menus, and clipboard insights surface the same capabilities.

See [ROADMAP.md](./ROADMAP.md) for what is planned next.

**Legend:** **Shipped** = available today · **Partial** = subset of the spec · **Deferred** = planned · **Out of scope** = intentionally not building (see roadmap)

---

## Spec coverage matrix

| Spec area | Status | Registry / notes |
| --------- | ------ | ---------------- |
| **1. Clipboard & text** | **Shipped** | `clipboard.manager`; text toolkits (formatter, case, cleaner, analyzer, lines, find/replace, diff, dummy data). Smart paste detects JSON, JWT, URL, color, timestamp, XML, YAML, Base64 ([`detection` engine](src/core/engines/detection/index.ts)). |
| **2. Developer (JSON, encoding, IDs, hash, JWT, regex)** | **Shipped** / **Partial** | JSON/XML/YAML/SQL/regex/ID toolkits; `data.universal-converter`. JSON **diff engine exists, no UI tab yet** (Phase 2). JWT decode only (not sign/verify). |
| **3. URL & web utilities** | **Partial** | `web.url-toolkit`, links, images, page info. No DNS/WHOIS/SSL/redirect SaaS lookups (out of scope). |
| **4. Color & design** | **Shipped** | Color convert/pick/palette, contrast, CSS generators; eyedropper + context menu pick. |
| **5. Screenshots** | **Partial** | Visible tab capture + annotations. No full-page, element-only, or OCR yet (Phase 2). |
| **6. QA / testing** | **Shipped** / **Partial** | Element inspector, selectors, XPath, test data, HTTP status reference, bug reporter. `api.request-builder` under **API** category (history + response diff). |
| **7. Security utilities** | **Shipped** | Encoder, hash/HMAC, JWT decode, password/random generators — local Web Crypto where applicable. |
| **8. Time tools** | **Shipped** | `datetime.toolkit` (diff, zones, cron) + `productivity.timer`. |
| **9. Calculators** | **Partial** | Basic/scientific calc, unit converter, base converter — not full fraction/ratio/percentage suite. |
| **10. File tools** | **Partial** | CSV/JSON/text viewers, image→PDF locally. |
| **11. Image tools** | **Partial** | Resize, crop, convert, info, Base64 in `image.image-toolkit`. |
| **12. QR** | **Shipped** | Generate + decode in `generators.qr-toolkit`. |
| **13. Web page / SEO** | **Shipped** / **Partial** | `web.page-info`, `seo.toolkit`. No broken-link crawler yet (Phase 3). |
| **14. Website inspector (Wappalyzer-style)** | **Deferred** | Phase 5 epic. |
| **15. Element inspector / selectors** | **Shipped** | QA toolkits + shared picker/selector engine. |
| **16–18. Responsive, rulers, measurement** | **Deferred** | Phase 5. |
| **19. Productivity (tabs, bookmarks)** | **Partial** | Notes, timer, tab search/duplicates/URLs. No bookmark manager or tab groups yet. |
| **20. Notes** | **Shipped** | Notepad/Sticky Notes-style editor: formatting toolbar + shortcuts, checklists, colors, find/replace, go to line, zoom, word wrap, preview, status bar; export TXT/MD/HTML/Word/PDF/ZIP/JSON, import, print. |
| **21. AI utilities** | **Out of scope** | Optional future module; off by default. |
| **22. Generators** | **Partial** | Test data, passwords, UUIDs, QR, lorem — not full fake-identity suite. |
| **23. Data format converters** | **Shipped** | `data.universal-converter` + JSON toolkit converts. |
| **24. SQL** | **Partial** | Format/minify; no SQL→JSON UI. |
| **25. Translation / language** | **Out of scope** | Not a translation product. |
| **26. Browser quick actions** | **Shipped** | Context menus + commands; see [PERMISSIONS.md](./PERMISSIONS.md). |
| **Ad blocking (MV3)** | **Shipped** | `privacy.ad-blocker` — DNR filter lists, cosmetic hiding, YouTube scripts; off by default. |
| **Storage (local/session)** | **Partial** | `storage.inspector` — **localStorage + sessionStorage only** (cookies planned Phase 2). |

---

## Legacy routes

Old URLs redirect in the app shell ([`AppShell.tsx`](src/app/layouts/AppShell.tsx)):

| Legacy path | Resolves to |
| ----------- | ----------- |
| `/tools/clipboard/history`, `/pinned`, `/search` | `clipboard.manager` |
| `/tools/text/word-counter`, `/line-counter` | `text.analyzer` |
| `/tools/text/duplicate-line-remover`, `/sort-lines` | `text.line-tools` |
| `/tools/text/lorem-ipsum` | `text.dummy-data` |
| `/tools/text/markdown-formatter`, `/html-formatter`, `/css-formatter`, `/javascript-formatter` | `text.formatter` |
| `/tools/qa/api-request-builder` | `api.request-builder` |
| `/tools/developer/timestamp-toolkit` | `datetime.toolkit` |

---

## Clipboard

| Tool | Route | Capabilities |
| ---- | ----- | ------------ |
| Clipboard Manager | `/tools/clipboard/manager` | History (search), pin, delete, clear, tabs for all/text/pinned |

Capture is **not** passive: panel focus, paste, and “add from clipboard” in the panel. Configurable in Settings; data stays local.

---

## Text

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Code Formatter | `/tools/text/formatter` | Format/minify JS, TS, HTML, XML, CSS, Markdown (use JSON Toolkit for JSON) |
| Case Converter | `/tools/text/case-converter` | camel, snake, kebab, title, etc. |
| Text Cleaner | `/tools/text/whitespace-cleaner` | Trim, collapse whitespace, normalize breaks |
| Text Analyzer | `/tools/text/analyzer` | Words, chars, lines, reading time |
| Line Tools | `/tools/text/line-tools` | Dedupe, sort, reverse, shuffle, numbering |
| Find & Replace | `/tools/text/find-replace` | Regex, case, whole-word |
| Text Diff | `/tools/text/diff` | Line diff |
| Dummy Data | `/tools/text/dummy-data` | Lorem / random text |

---

## Developer

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| JSON Toolkit | `/tools/developer/json-toolkit` | Validate, format, minify, tree, JSONPath, convert |
| XML Toolkit | `/tools/developer/xml-toolkit` | Validate, format, minify, → JSON |
| YAML Toolkit | `/tools/developer/yaml-toolkit` | Validate, format, ↔ JSON |
| SQL Toolkit | `/tools/developer/sql-toolkit` | Format + minify (dialects) |
| Regex Toolkit | `/tools/developer/regex-toolkit` | Test, replace, library |
| UUID / ID Toolkit | `/tools/developer/id-toolkit` | UUID v4/v7, NanoID, validate |
| Timestamp Toolkit (legacy) | `/tools/developer/timestamp-toolkit` | **Disabled** registry entry; use Date & Time Toolkit |

Engines: `src/core/engines/` (`json`, `xml`, `yaml`, `sql`, `regex`, `id`, `date`, …).

---

## API & HTTP

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| API Request Builder | `/tools/api/request-builder` | GET/POST/…, headers/body, optional host permission, response view, **history**, **response diff** |

---

## Data conversion

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Universal Converter | `/tools/data/universal-converter` | JSON, CSV, XML, YAML, Markdown tables, TSV |

---

## QA

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Element Inspector | `/tools/qa/element-inspector` | Pick element → DOM, styles, dimensions |
| Selector Generator | `/tools/qa/selector-generator` | CSS + XPath |
| XPath Tester | `/tools/qa/xpath-tester` | Live page XPath |
| Test Data Generator | `/tools/qa/test-data-generator` | Names, emails, etc. → JSON/CSV |
| HTTP Status Codes | `/tools/qa/http-status` | Reference lookup |
| Bug Reporter | `/tools/qa/bug-reporter` | URL, viewport, steps → markdown |

---

## Web

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| URL Toolkit | `/tools/web/url-toolkit` | Parse, encode/decode, query editor, UTM-style cleaner |
| Link Toolkit | `/tools/web/link-toolkit` | Internal/external links |
| Image Links | `/tools/web/image-links` | Image URLs, alt text |
| Page Information | `/tools/web/page-info` | Meta, canonical, OG, Twitter |
| HTML Bundle Downloader | `/tools/web/html-bundle` | Scan `.html` anchor links, select pages, ZIP with assets (file:// folder fallback) |

---

## Security

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Encoder / Decoder | `/tools/security/encoder-decoder` | Base64, URL, HTML, Unicode, Hex |
| Hash Toolkit | `/tools/security/hash-toolkit` | SHA family, MD5 (legacy), HMAC |
| JWT Toolkit | `/tools/security/jwt-toolkit` | Decode + expiry; **not** signature verification |
| Password Generator | `/tools/security/password-generator` | Crypto-random |
| Random Generator | `/tools/security/random-generator` | Numbers, strings, hex, UUID, NanoID |

---

## Design

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Color Converter | `/tools/design/color-converter` | HEX/RGB/HSL/HSV/HWB/CMYK |
| Color Picker | `/tools/design/color-picker` | Eyedropper + swatch |
| Palette Generator | `/tools/design/palette-generator` | Harmonies + CSS export |
| Contrast Checker | `/tools/design/contrast-checker` | WCAG AA/AAA |
| CSS Generator | `/tools/design/css-generator` | Gradient, shadow, radius, glass |

---

## Screenshots

| Tool | Route | Highlights |
| ---- | ----- | ---------- |
| Capture Toolkit | `/tools/screenshots/capture` | **Visible tab** + annotations (shapes, blur, text, markers) |

---

## Calculators · Date & time · Image · Files · Generators · SEO · Productivity · Browser · Storage · Accessibility

| Category | Tool | Route |
| -------- | ---- | ----- |
| Calculators | Calculator, Unit Converter, Number Base Converter | `/tools/calculators/*` |
| Date & time | Date & Time Toolkit | `/tools/datetime/toolkit` |
| Image | Image Toolkit | `/tools/image/image-toolkit` |
| Files | File Toolkit | `/tools/files/file-toolkit` |
| Generators | QR Code Toolkit | `/tools/generators/qr-toolkit` |
| SEO | SEO Toolkit | `/tools/seo/toolkit` |
| Productivity | Notes, Timer, Tab Manager, Form Autofill (beta) | `/tools/productivity/*` |
| Privacy | Ad Blocker | `/tools/privacy/ad-blocker` |
| Browser | Browser Toolkit | `/tools/browser/toolkit` |
| Storage | Storage Inspector | `/tools/storage/inspector` (local + session storage) |
| Accessibility | Accessibility Quick Check | `/tools/accessibility/toolkit` |

---

## Platform surfaces

- **Side panel** — primary UI; search + categories + favorites + recents
- **Command palette** — `Ctrl/Cmd+Shift+Space` (manifest commands)
- **Context menus** — selection/page/link/image tool groups
- **Smart paste** — home screen clipboard analysis → suggested tool
- **DevTools** — page-aware tools with `DEVTOOLS` capability

---

## Engines

Pure logic lives in `src/core/engines/` (`text`, `diff`, `json`, `encoding`, `url`, `color`, `date`, `hash`, `jwt`, `regex`, `unit`, `base`, `id`, `password`, `xml`, `yaml`, `sql`, `csv`, `qrcode`, `timezone`, `detection`, `selector`, `capture`, `image`, `calc`, `seo`, `testdata`, `api`, `httpClient`). Tool UIs and Chrome surfaces call engines — no duplicated business logic.

---

## Explicitly out of scope

- Third-party **DNS / WHOIS / SSL checker / redirect** services
- **AI** rewrite/translate as a core feature (optional future module)
- **“1000 tools”** parity with generic toolbox websites
- **JWT signature verification** unless we add explicit key-handling UX later
