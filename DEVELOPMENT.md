# Development

## Setup

```bash
bun install
bun run dev
```

Load `dist/` via `chrome://extensions` → *Load unpacked*. Vite rebuilds on change; reload the extension card after manifest changes.

### Form Autofill package

The Form Autofill tool comes from `@universal-form-autofill/sdk`, linked from `universal-form-autofill/release/sdk`. That folder is its own git repository and is ignored here, like `postman-lite`, so `npm install` fails until the package has been built:

```bash
cd universal-form-autofill
pnpm install
pnpm build:package
```

`dev` and `build` run `npm run autofill:assets`, which copies the package's page runtime into `public/form-autofill/` (also ignored). Rebuild the package and rerun that script after changing anything in `universal-form-autofill/`.

## Add a new tool

1. Create `src/tools/<category>/<tool-name>/logic.ts` — pure functions, no Chrome APIs.
2. Create `src/tools/<category>/<tool-name>/Tool.tsx` — the UI, built from `ToolPage`, `TextEditor` and shared components.
3. Register it in `src/modules/<category>/registry.ts`:

```ts
{
  id: 'text.my-tool',
  name: 'My Tool',
  description: '…',
  category: 'text',
  icon: WandIcon,
  keywords: ['…'],
  route: '/tools/text/my-tool',
  capabilities: ['SIDE_PANEL'],
  loader: () => import('@/tools/text/my-tool/Tool'),
}
```

That's it — home, search, command palette, favorites, recents and routing pick it up automatically.

4. Add unit tests in `tests/` for the logic.

## Add a new module (category)

1. Add the category to `src/core/registry/categories.ts` (set `enabled: true` when it ships).
2. Create `src/modules/<category>/registry.ts` and register it in `src/modules/index.ts`.

## Add a language

1. Add a translation catalog at `src/i18n/locales/<language>.ts` with the same keys as `en.ts`.
2. Register that catalog and language code in `src/i18n/index.ts`; keep English as the fallback.
3. Add `public/_locales/<language>/messages.json` with the Chrome message names used by `manifest.config.ts` and the background service worker.
4. Add the locale to `supportedLngs` and test translated labels and plural forms.

Use `useTranslation()` for interface copy. Keep tool IDs, routes, storage values and logic independent of translated labels. User-provided text and code examples should remain untouched.

## Rules

- Chrome APIs only inside `core/` or `chrome/` services — never in components.
- Business logic lives in `logic.ts` as pure functions with unit tests.
- No `any`, no `eval`, no unsanitized HTML injection, no hardcoded colors.
- Keep components small; reuse `ToolPage`, `TextEditor`, `ToolActions`, `EmptyState`, `ErrorState`, `ConfirmDialog`.

## Testing

```bash
bun run test        # Vitest (jsdom, chrome API mocked in tests/setup.ts)
bun run typecheck
bun run lint
```

## Manual verification checklist

- [ ] `bun run build` → load `dist/` unpacked
- [ ] Toolbar click opens the side panel
- [ ] Home shows search, favorites, recents, categories, coming-soon chips
- [ ] `Ctrl/Cmd + K` opens the command palette; selecting a tool navigates
- [ ] Favorite a tool → appears under Favorites after panel reload
- [ ] Open tools → appear under Recent
- [ ] Clipboard: copy text, reopen/focus panel or use "Add current clipboard"
- [ ] Theme light/dark/system switches correctly
- [ ] Panel stays usable at narrow width
