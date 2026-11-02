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

The home dashboard exposes tools directly in seven workbenches below Popular Tools, each with at most ten launchers: Develop & QA (IDE command grid), Design & Accessibility (type and swatch canvas), Web & Security (network map), Productivity (planner), Browser Workspace (tabbed window), Social & Platforms (app dock), and Files, Media & Utilities (file shelf). Viewport-triggered motion respects reduced-motion preferences. This home-only grouping preserves the All Tools library's category filters and existing tool routes.

Quick Actions adapt from a four-action dock to two columns in narrow panels; Favorites wrap into a readable grid, and Recently Used shows compact resume cards. Productivity and file shelves use compact icon-and-name launchers. The header's Ad Blocker and Web Protection icons open quick settings instead of immediately toggling protection, with the same power/status card used on each full tool page. Turning protection on still requests site access when required.

Browser Workspace and Productivity play short decorative tab-loading and planner sequences while visible; these are illustrations, not live status. Design & Accessibility has a keyboard-accessible Stack/Spread control for its tool-card deck. Motion honors reduced-motion preferences and stops when the page is hidden.

Tool navigation uses an outlined sliding selection rail with overflow controls and keyboard navigation; PDF Toolkit keeps its existing category chips. Each tool's three-dot menu starts with **Watch demo**, also available from its info panel. Walkthroughs load on demand and use sample data; workspace overview tools offer demos for their child tools. **Report an issue** opens a dedicated full-page experience with a guided form, privacy details, a review step, and GitHub/email/copy actions. Nothing is sent automatically.

Help and feedback stays in one compact three-card row at every panel width. Small decorative issue, email, and rating demos play in sequence inside the cards, pause offscreen or when the page is hidden, and respect reduced motion. Descriptions remain available to screen readers without adding visual height. The existing report page, email draft, and store links remain the actions; animations never send anything.

## Documentation

- [TOOLS.md](./TOOLS.md) — **shipped capabilities**, spec coverage matrix, legacy routes
- [ROADMAP.md](./ROADMAP.md) — phased plan and explicit exclusions
- [ARCHITECTURE.md](./ARCHITECTURE.md) — platform design, registries, message flow
- [DEVELOPMENT.md](./DEVELOPMENT.md) — how to add a new tool or module
- [PERMISSIONS.md](./PERMISSIONS.md) — why each Chrome permission exists

## Stack

Bun · Vite · React 19 · strict TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · @crxjs/vite-plugin · Vitest
