# Permissions

The extension requests the minimum set required for the implemented features. Each permission below is in use by shipped functionality.

| Permission       | Why                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidePanel`      | The side panel is the primary UI of the extension.                                                                                                                                                                          |
| `storage`        | Settings, favorites, recent tools and clipboard history persist in `chrome.storage.local`. Short-lived tool handoffs (context-menu picks, element-picker results) use `chrome.storage.session` and expire within 5 minutes. |
| `clipboardRead`  | Clipboard tools read the current clipboard text on user action (button, paste, panel focus) and for the optional "Analyze clipboard" suggestions on the home screen.                                                        |
| `clipboardWrite` | "Copy again" / copy-result actions write to the clipboard.                                                                                                                                                                  |
| `contextMenus`   | The right-click "Toolbox" menu (grouped by Text / Developer / QA / Page / Color) launches tools with the current selection, link, image or page as payload.                                                                 |
| `activeTab`      | Lets the element picker and page tools run on the tab you explicitly interact with — only after a keyboard command or menu click.                                                                                           |
| `scripting`      | Injects the on-demand page-tools content script and registers ad-blocker scripts when you enable ad blocking in Settings.                                                                                                  |
| `tabs`           | Reads the active tab and supports Tab Manager and Browser Toolkit actions.                                                                                                                                                   |
| `declarativeNetRequest` | Applies bundled static filter rules to block ad and tracker requests when ad blocking is enabled.                                                                                                                      |
| `declarativeNetRequestFeedback` | Shows per-tab blocked-request counts on the extension badge and in the Ad Blocker tool.                                                                                                                        |
| Optional HTTP(S) hosts | The API Request Builder requests access to the selected hostname only after Send is clicked. The grant covers all ports on that hostname and can be revoked in Chrome settings. |

## Deliberately NOT requested

- `cookies`, `bookmarks`, `sessions`, `alarms` — these will be added only when a feature needs them and after an explicit user action.
- Required HTTP(S) host permissions — HTTP(S) access is declared as optional and is not granted by default.
- The page-tools content script bundle uses a non-routable manifest match pattern so Chrome does not auto-inject it on real pages; the background service worker injects it with `scripting.executeScript` when you use page tools or the element picker.
- Ad-blocker cosmetic and YouTube scripts are registered with `chrome.scripting.registerContentScripts` only while ad blocking is enabled in Settings. Filter lists are bundled under `public/adblock/` (rebuild with `npm run adblock:lists`); the extension does not download remote filter code at runtime.
- `clipboardRead` is never used to exfiltrate data: clipboard contents are processed locally and stored only on-device, with a disable switch, size limit and clear-all in Settings.

## Privacy

- The API Request Builder sends requests directly to the user-selected host after an explicit action and optional Chrome permission prompt. Recent responses are stored locally in `chrome.storage.local` (capped) for the History tab; credentials are not saved. JSON response fields with common credential names are redacted in the displayed body. No analytics, remote code, or remote fonts.
- Page inspection runs only after you open a page tool or use a keyboard command; the content script is injected on demand for that tab.
- Element-picker results and context-menu payloads stay in `chrome.storage.session` on this device and expire after 5 minutes.
- Clipboard history may contain sensitive text — the Settings page warns about this and lets users disable or wipe it at any time.
- Ad blocking is **on by default** and can be turned off in Settings or the Ad Blocker tool. It may break sites that depend on third-party scripts; use the per-site allowlist or “Pause ad blocking on this site” in the context menu.
- Optional premium features (all off by default): cookie consent pop-up hiding (`cookies.css` plus the Fanboy annoyances ruleset), distraction control (`distractions.css`), and push notification blocking (`notifications-main.js`, MAIN world, which auto-denies `Notification.requestPermission` and `PushManager.subscribe`).
- When ad blocking is turned on, the scripts are injected once into already-open tabs, including background YouTube tabs, so blocking starts without a reload. Blocked counts are kept per tab in `chrome.storage.session` and as a running total in `chrome.storage.local`.
