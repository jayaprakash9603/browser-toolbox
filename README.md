# One Panel

**One Chrome extension. Everything you need.**

An all-in-one Manifest V3 extension that replaces dozens of tiny utilities with a single **side panel**: search any tool, favorite it, use keyboard shortcuts, and work locally without opening another website.

**Core focus:** Developer + QA + web productivity — consolidated toolkits, not a popup with hundreds of icons.

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

## What ships today

- **20 categories**, **53 registered tools** (mostly multi-feature toolkits)
- **Clipboard & text** — manager, formatters, case/line tools, diff, lorem
- **Developer & data** — JSON/XML/YAML/SQL, regex, IDs, universal converter
- **API** — request builder with history and response diff (user-initiated HTTP)
- **QA** — element inspector, selectors, XPath, test data, bug reporter
- **Web, design, security, screenshots, calculators, datetime, image, files, QR, SEO, productivity, browser, storage, accessibility**

Platform: global search, command palette (`Ctrl/Cmd+Shift+Space`), favorites, recents, smart clipboard suggestions, context menus, light/dark/system theme, local settings.

## Documentation

- [TOOLS.md](./TOOLS.md) — **shipped capabilities**, spec coverage matrix, legacy routes
- [ROADMAP.md](./ROADMAP.md) — phased plan and explicit exclusions
- [ARCHITECTURE.md](./ARCHITECTURE.md) — platform design, registries, message flow
- [DEVELOPMENT.md](./DEVELOPMENT.md) — how to add a new tool or module
- [PERMISSIONS.md](./PERMISSIONS.md) — why each Chrome permission exists

## Stack

Bun · Vite · React 19 · strict TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · @crxjs/vite-plugin · Vitest
