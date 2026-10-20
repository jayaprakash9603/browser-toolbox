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
| DevTools page | `devtools.html` → `src/chrome/devtools/` | Toolbox + **Interceptor** panels (`#/devtools`, `#/devtools/interceptor`) |
| Content scripts | `src/chrome/content/` | Page-tools bridge (on-demand inject) + ad-blocker scripts (`public/adblock/scripts`, registered when enabled) + HTTP Interceptor (`public/interceptor/scripts`, registered when page-level rules exist) |

Message flow targets `SIDE PANEL ↔ BACKGROUND ↔ CONTENT SCRIPT ↔ PAGE` and `DEVTOOLS ↔ BACKGROUND ↔ SIDE PANEL`, using the discriminated-union `ExtensionMessage` contract in `core/messaging/types.ts`. Components never call `chrome.*` directly; they go through services in `core/`.

## Registries

- `toolRegistry` — id, name, description, category, icon, keywords, route, capabilities, `loader()` for `React.lazy`. Duplicate ids throw.
- `categoryRegistry` — id, name, icon, order, enabled flag (future categories render as "coming soon").

Modules register themselves in `src/modules/index.ts` (`registerModules()`), called once from `main.tsx`.

## Routing & loading

A tiny hash router (`#/tools/text/word-counter`) maps routes to tools via the registry. Tool components are lazy-loaded through `getToolComponent()`, which caches `React.lazy` instances per tool id — tools are code-split into separate chunks and only fetched when opened.

## Storage

`core/storage/storageService` wraps `chrome.storage.local` with typed keys (`settings`, `favorites`, `recentTools`, `clipboardHistory`, `adblock`, `meta`) and a `storageVersion` field for future migrations.

## Ad blocking

Opt-in feature (`privacy.ad-blocker` tool + Settings). State lives in `core/adblock/` (`adblock` storage key). The background module `chrome/background/adblock/` syncs:

1. Static `declarativeNetRequest` rulesets (`public/adblock/rulesets/*.json`, toggled via `updateEnabledRulesets`).
2. Dynamic allowlist rules (`allowAllRequests` per hostname).
3. Registered content scripts for cosmetic CSS and YouTube pruning/skipper.

Filter lists are converted at build time (`npm run adblock:lists`); page scripts are built with `npm run adblock:scripts` (IIFE, no CRXJS loader).

## Web protection

On by default (`privacy.web-protection` tool + Settings). State lives in `core/protection/` (`protection` and `protectionStats` storage keys). The background module `chrome/background/protection/`:

1. Loads bundled `public/protection/threats.json` (rebuilt with `npm run protection:lists` from phishing, URLhaus, uBO badware and NoCoin cryptominer feeds).
2. Installs **dynamic** `declarativeNetRequest` rules: hosts (including IP literals) are chunked 1,000 per rule into `requestDomains`; `main_frame` navigations redirect to `blocked.html`, sub-resources are blocked. This keeps the redirect (unsafe) and regex rule counts far below Chrome's 5,000 / 1,000 limits.
3. Registers content scripts at `document_start` (trusted sites excluded via `excludeMatches`):
   - `heuristics.js` (isolated world, all frames): look-alike login and tech-support scam text detection with overlays, relays page-guard signals, reports user gestures for the download guard.
   - `guard-scam.js` (main world, top frame): neutralises browser lockers (dialog floods, forced fullscreen, keyboard lock, `pushState` floods, `beforeunload` traps).
   - `guard-clipboard.js` (main world, all frames): blocks hidden shell commands copied to the clipboard (ClickFix / fake CAPTCHA).
   - `guard-notify.js` (main world, top frame): denies notification/push requests made without a user gesture.
4. Hooks `chrome.downloads.onDeterminingFilename`, which holds every download before anything is written or the Save As dialog opens: downloads from threat hosts are cancelled; executables that start without a recent user gesture on the source site stay held until the user answers `blocked.html?mode=download` (closing it deletes the download).

List entries that would block a whole TLD, a public suffix or a site in `SAFE_DOMAINS` (Google, YouTube, Bing, Microsoft, ...) are dropped both when lists are built and when rules are installed (`isSafeToBlock`), because `requestDomains` also matches every subdomain.

Page-world guards talk to the isolated script through `window.postMessage` (`PAGE_MESSAGE_KEY` / `PAGE_COMMAND_KEY`); the background only trusts `sender.url`, and only extension pages may decide on paused downloads.

Trusted sites and one-time “proceed anyway” use dynamic/session allow rules in dedicated ID ranges (separate from the ad-block allowlist at 1_000_000+). Cookie consent auto-decline (`adblock/scripts/cookies-reject.js`) belongs to the ad blocker's cookie-banner setting and is mirrored in the Web Protection tool.

## Site enhancements (YouTube)

Category `sites` / tool `sites.youtube`. State in `core/sites/youtube/` (`youtubeEnhancer` storage key). A declarative feature catalog drives the side-panel UI, defaults, presets, and tests.

Background `chrome/background/sites/` registers `yt-isolated.js` + `yt-main.js` (MAIN world) and `sites/youtube/youtube.css` on YouTube matches at `document_start`, and reinjects into open tabs when settings change.

- **CSS features:** isolated script sets `data-tbx-yt-*` on `<html>`; static `public/sites/youtube/youtube.css` hides clutter (feeds, watch page, Shorts, embeds).
- **Script features:** feed filters (keywords, channels, watched %), Shorts redirect, player controls (speed, wheel, quality), still-watching dismiss, SponsorBlock skip (opt-in; background fetches `sponsor.ajay.app`), Return YouTube Dislike (opt-in; `returnyoutubedislikeapi.com`).
- **Progress bar:** CSS variables + theme presets in the tool UI.
- **Ads:** “Block ads” mirrors `adblock.youtubeEnabled` (same as Web Protection’s ad-block mirror); does not duplicate `adblock/youtube` scripts.

## Theming

shadcn/ui CSS variables (`src/styles/globals.css`) with light/dark palettes; `ThemeApplicator` applies light/dark/system based on the settings service. No hardcoded colors in components.

## Localization

React UI strings live in `src/i18n/locales/<language>.ts` and are resolved with i18next. The English catalog is the current supported and fallback locale. Tool and category names use stable registry IDs as translation keys, so routes and storage IDs do not change with the selected language. Chrome-owned strings (extension name, action title, command description and context menu) live in `public/_locales/<language>/messages.json` and are referenced with Chrome `__MSG_...__` messages.

When adding a locale, provide the same translation keys in a new React catalog, register it in `src/i18n/index.ts`, add a matching Chrome messages file, and add the locale to `supportedLngs`.

## HTTP Interceptor

See `core/interceptor/` and `chrome/background/interceptor/` for DNR rules, page fetch/XHR mocks, optional userScripts/deep intercept, and the `webRequest` network log.

## Performance

- Tools are lazy chunks; nothing tool-specific loads at startup.
- Global search is pure client-side string matching.
- Storage writes are batched per action (no write-per-keystroke).

## Security

No `eval`, no remote code, no unsanitized HTML injection (all tool output renders as text), no network calls, least-privilege permissions (see PERMISSIONS.md).
