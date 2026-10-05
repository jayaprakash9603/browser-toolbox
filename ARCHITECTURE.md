# Architecture

## Guiding principle

**Core platform + feature modules + tools + adapters + shared UI/services.**

A tool is data (`ToolDefinition`) plus a lazily loaded React component. The shell, search, favorites, recents, command palette and routing all read from the registries — adding a tool never requires editing them.

```
src/
  app/        App, router (hash-based), AppShell layout, pages, providers
  core/       registry/ messaging/ storage/ clipboard/ events/ logging/ errors/ constants/
  modules/    one folder per domain; registry.ts self-registers tools
  tools/      one folder per tool; Tool.tsx + logic.ts (pure, tested)
  shared/     components/ (incl. ui/ shadcn) hooks/ utils/
  features/   command-palette/ favorites/ recent-tools/ search/ settings/
  chrome/     background/ content/ devtools/ context-menu/
tests/
```

## Chrome surfaces

| Surface | Entry | Status |
| --- | --- | --- |
| Side panel (primary UI) | `index.html` → `src/main.tsx` | Implemented |
| Background service worker | `src/chrome/background/index.ts` | Implemented (menus, commands, message router) |
| Context menus | `src/chrome/context-menu/` | Manager scaffold; "Open toolbox" item live |
| DevTools page | `devtools.html` → `src/chrome/devtools/` | Placeholder panel registration |
| Content scripts | `src/chrome/content/` | Bridge placeholder (not registered in manifest) |

Message flow targets `SIDE PANEL ↔ BACKGROUND ↔ CONTENT SCRIPT ↔ PAGE` and `DEVTOOLS ↔ BACKGROUND ↔ SIDE PANEL`, using the discriminated-union `ExtensionMessage` contract in `core/messaging/types.ts`. Components never call `chrome.*` directly; they go through services in `core/`.

## Registries

- `toolRegistry` — id, name, description, category, icon, keywords, route, capabilities, `loader()` for `React.lazy`. Duplicate ids throw.
- `categoryRegistry` — id, name, icon, order, enabled flag (future categories render as "coming soon").

Modules register themselves in `src/modules/index.ts` (`registerModules()`), called once from `main.tsx`.

## Routing & loading

A tiny hash router (`#/tools/text/word-counter`) maps routes to tools via the registry. Tool components are lazy-loaded through `getToolComponent()`, which caches `React.lazy` instances per tool id — tools are code-split into separate chunks and only fetched when opened.

## Storage

`core/storage/storageService` wraps `chrome.storage.local` with typed keys (`settings`, `favorites`, `recentTools`, `clipboardHistory`, `meta`) and a `storageVersion` field for future migrations.

## Theming

shadcn/ui CSS variables (`src/styles/globals.css`) with light/dark palettes; `ThemeApplicator` applies light/dark/system based on the settings service. No hardcoded colors in components.

## Localization

React UI strings live in `src/i18n/locales/<language>.ts` and are resolved with i18next. The English catalog is the current supported and fallback locale. Tool and category names use stable registry IDs as translation keys, so routes and storage IDs do not change with the selected language. Chrome-owned strings (extension name, action title, command description and context menu) live in `public/_locales/<language>/messages.json` and are referenced with Chrome `__MSG_...__` messages.

When adding a locale, provide the same translation keys in a new React catalog, register it in `src/i18n/index.ts`, add a matching Chrome messages file, and add the locale to `supportedLngs`.

## Performance

- Tools are lazy chunks; nothing tool-specific loads at startup.
- Global search is pure client-side string matching.
- Storage writes are batched per action (no write-per-keystroke).

## Security

No `eval`, no remote code, no unsanitized HTML injection (all tool output renders as text), no network calls, least-privilege permissions (see PERMISSIONS.md).
