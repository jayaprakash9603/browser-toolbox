# Ad Blocker: Desktop Audit and Firefox for Android Test Report

Last updated: implementation baseline (automated checks); Fenix device sections require manual verification on hardware.

## 1. Desktop implementation audit

### Engine and architecture

| Component | Implementation |
|-----------|------------------|
| Network blocking | MV3 **Declarative Net Request** static rulesets (`ruleset-ads`, `ruleset-privacy`, `ruleset-annoyances`, `ruleset-youtube`) in `public/adblock/rulesets/*.json`, toggled via `chrome.declarativeNetRequest.updateEnabledRulesets` |
| Redirect resources | DNR `redirect` actions to extension-owned stubs under `public/adblock/redirects/` |
| Allowlist / site pause | Dynamic DNR rules (`allowAllRequests`, IDs from `1_000_000`) + content-script `excludeMatches` |
| Cosmetic filtering | Isolated-world `cosmetic.js`: sharded selectors, procedural filters, `generic.css`, MutationObserver |
| Scriptlets / anti-adblock | Isolated bootstrap + MAIN-world runner; bloom gate + per-host shards |
| Popups / pop-unders | MAIN-world `popups-main.js` (gesture-aware `window.open` policy) |
| Notification abuse | MAIN-world `notifications-main.js` |
| YouTube | Dedicated ruleset + `youtube-isolated.js` on YouTube host matches |
| State | `storage.local` key `adblock` via `src/core/adblock/adblockService.ts` |
| Sync orchestration | `src/chrome/background/adblock/index.ts` → rulesets, allowlist, content scripts, open-tab injection |
| Filter lists | Build-time: `npm run adblock:lists` from EasyList, EasyPrivacy, uBO assets, Peter Lowe, Fanboy (`scripts/adblock/sources.json`) |
| Statistics | Network: `onRuleMatchedDebug` (Chromium) or `getMatchedRules` reconciliation; cosmetic/popup/youtube via extension messages |
| UI | Tool `privacy.ad-blocker`: master toggle, site card, live tabs, plus features, ruleset toggles, allowlist |

### Request path (desktop)

1. User enables ad blocker → optional `<all_urls>` grant → storage update.
2. Background `syncAdblockState()` enables static DNR rulesets per list toggles.
3. Subresource and frame requests matched by DNR are blocked or redirected before they reach the page.
4. Surviving ad DOM is hidden by cosmetics; scriptlets neutralize known anti-adblock and player hooks.
5. Popups and unwanted windows are intercepted in MAIN world (not DNR).

### Permissions (Firefox desktop build)

`declarativeNetRequest`, `scripting`, `storage`, `tabs`, `alarms`, `optional_host_permissions: <all_urls>`. No `declarativeNetRequestFeedback` on Firefox.

### Deliberately not used for ads

- `webRequest` blocking listeners (reserved for HTTP Interceptor optional permission).

---

## 2. Firefox Android compatibility (implemented mitigations)

| Gap | Mitigation |
|-----|------------|
| Chromium-only list preprocessor | `SHIPPED_MV3_ENV` union includes `env_firefox` / `env_gecko` at build time |
| No DNR feedback API | Capability-gated stats; reconcile on tab complete; UI disclaimer on Firefox |
| MAIN-world script cost on mobile | `prefersTopFrameMainScripts` on mobile Firefox; injection fallback on register failure |
| Idle background termination | `runtime.onStartup` / `onInstalled` re-sync; DNR rules persist without background |
| No runtime list updates (pre-change) | Supplemental dynamic DNR rules from cached downloads (capped); bundled static remains primary |
| Sync XHR in scriptlets | Async shard prefetch with early delivery when possible |

Runtime profile: `src/platform/adblock/runtime.ts`. Layout hook: `src/platform/adblock/useExtensionLayout.ts`.

---

## 3. Automated test status

| Area | Status |
|------|--------|
| Preprocess env union | `tests/adblock-preprocess.test.ts` |
| Runtime profile detection | `tests/adblock-runtime.test.ts` |
| Runtime filter compiler (domain rules) | `tests/adblock-filter-lists-runtime.test.ts` |
| Existing adblock sync / compiler / cosmetic tests | Unchanged regressions via `npm test` |

---

## 4. Manual Fenix test matrix

Run on **Firefox for Android** (release or Beta) with the `firefox` XPI installed. Mark each row after testing.

| # | Scenario | Expected | Result | Notes |
|---|----------|----------|--------|-------|
| 1 | Google AdSense / display sites | Network blocks + elements hidden | _pending device_ | |
| 2 | Third-party display ads | iframe/img blocked or hidden | _pending device_ | |
| 3 | Popup ads | Popups blocked; legitimate login popups allowed | _pending device_ | |
| 4 | Pop-under attempts | Blocked or no new background tab | _pending device_ | |
| 5 | Auto redirect ads | DNR blocks redirect endpoints where listed | _pending device_ | |
| 6 | Sticky / floating banners | Cosmetic hide | _pending device_ | |
| 7 | Third-party ad iframes | Blocked or empty frame | _pending device_ | |
| 8 | Dynamic injection | MutationObserver catches late inserts | _pending device_ | |
| 9 | Video preroll (web player) | Partial; stream SSAI not guaranteed | _pending device_ | |
| 10 | Fake notification prompts | Denied when setting on | _pending device_ | |
| 11 | Legitimate login / payment popups | Allowed (trusted hosts) | _pending device_ | |
| 12 | Normal navigation / downloads | No false blocks on main navigation | _pending device_ | |
| 13 | Browser restart | Protection still on; rules active | _pending device_ | |
| 14 | Background kill / resume | Sync recovers; counts eventually consistent | _pending device_ | |
| 15 | Tab switch / refresh | Scripts attach; stats update | _pending device_ | |
| 16 | Filter list refresh (UI) | Cache updated; dynamic rules within cap | _pending device_ | |
| 17 | Site allowlist | Site unblocked; global stays on | _pending device_ | |
| 18 | Global OFF | No DNR rulesets; scripts unregistered | _pending device_ | |
| 19 | Chrome / Edge desktop smoke | Unchanged behavior | _pending device_ | CI build only |

---

## 5. Supported / partial / not possible

### Strong support (extension design goal)

- Third-party ad and tracker URLs covered by shipped lists (DNR).
- Generic and site-specific cosmetic hiding.
- Popup / pop-under / overlay traps (MAIN world, top frame on mobile).
- Per-site allowlist and reload.
- EasyList / EasyPrivacy / uBO-derived **supported** filter syntax in the build pipeline.

### Partial support

- **Network statistics on Firefox** (including Fenix): approximate without `onRuleMatchedDebug`; hidden/popup counts remain reliable.
- **Toolbar badge counts**: may be unavailable; use panel totals.
- **Runtime filter refresh**: supplements static rules via bounded dynamic DNR rules; cannot replace full static rulesets without a new extension package.
- **Video ads**: player scriptlets and network rules only; not in-stream SSAI.
- **Subframe MAIN scriptlets** on mobile: reduced scope (`allFrames: false` for MAIN) may miss rare cross-frame scriptlet cases.

### Not possible (browser / platform limits)

- Server-side inserted or first-party native ads on the same origin as content.
- Ads inside restricted pages (`about:`, AMO, extension pages).
- Full uBlock Origin filter syntax (procedural cosmetics, HTML filters, all scriptlets).
- Guaranteed removal of sponsored content indistinguishable from editorial content.
- In-app or non-browser advertising.

---

## 6. Chrome and Edge desktop regression

After `npm run build:all` and `npm test`, desktop Chromium artifacts must continue to ship the same ruleset IDs, allowlist ID range (`1_000_000+`), and side panel UI. Shared code paths use capability detection so Chromium-specific APIs remain preferred when present.
