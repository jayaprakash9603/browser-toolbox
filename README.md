# Browser Toolbox

An all-in-one Chrome extension (Manifest V3) that collects productivity, developer, QA and text utilities into a single **side panel** — one extension instead of dozens.

**Phase 1 status:** foundation + Clipboard & Text tools are fully implemented. Developer, QA, Web, Design, Security, Calculator, Screenshot, File and Productivity categories are registered as *coming soon* placeholders.

## Quick start

```bash
bun install
bun run dev        # dev build with HMR (dist/)
bun run build      # production build (dist/)
bun run test       # unit tests (Vitest)
bun run lint       # ESLint
bun run typecheck  # strict tsc
```

Load the extension: `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select `dist/`. Click the toolbar icon to open the side panel.

## What's inside (Phase 1)

- **Clipboard** — Manager, History (search / pin / delete / clear, size limits, local-only), Pinned items, Clipboard Search
- **Text** — Formatter, Case Converter, Whitespace Cleaner, Duplicate Line Remover, Sort Lines, Line Counter, Word Counter, Find & Replace (regex / whole-word / case options), Text Diff, Lorem Ipsum, Markdown / HTML / CSS / JavaScript formatters

Plus platform features: global search, command palette (`Ctrl/Cmd + K`), favorites, recent tools, light/dark/system theme, and settings.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — platform design, registries, message flow
- [DEVELOPMENT.md](./DEVELOPMENT.md) — how to add a new tool or module
- [TOOLS.md](./TOOLS.md) — tool catalog
- [PERMISSIONS.md](./PERMISSIONS.md) — why each Chrome permission exists

## Stack

Bun · Vite · React 19 · strict TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · @crxjs/vite-plugin · Vitest
