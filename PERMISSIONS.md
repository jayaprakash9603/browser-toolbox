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
| `scripting`      | Injects the content script on demand (element picker, page info, storage snapshot). No persistent content scripts run on pages.                                                                                             |
| `tabs`           | Reads the active tab and supports Tab Manager and Browser Toolkit actions.                                                                                                                                                   |
| Optional HTTP(S) hosts | The API Request Builder requests access to the selected hostname only after Send is clicked. The grant covers all ports on that hostname and can be revoked in Chrome settings. |

## Deliberately NOT requested

- `cookies`, `bookmarks`, `sessions`, `alarms` — these will be added only when a feature needs them and after an explicit user action.
- Required HTTP(S) host permissions — HTTP(S) access is declared as optional and is not granted by default.
- The content script bundle is listed in the manifest with a non-routable match pattern so Chrome does not auto-inject it on real pages; the background service worker injects it with `scripting.executeScript` when you use page tools or the element picker.
- `clipboardRead` is never used to exfiltrate data: clipboard contents are processed locally and stored only on-device, with a disable switch, size limit and clear-all in Settings.

## Privacy

- The API Request Builder sends requests directly to the user-selected host after an explicit action and optional Chrome permission prompt. Recent responses are stored locally in `chrome.storage.local` (capped) for the History tab; credentials are not saved. JSON response fields with common credential names are redacted in the displayed body. No analytics, remote code, or remote fonts.
- Page inspection runs only after you open a page tool or use a keyboard command; the content script is injected on demand for that tab.
- Element-picker results and context-menu payloads stay in `chrome.storage.session` on this device and expire after 5 minutes.
- Clipboard history may contain sensitive text — the Settings page warns about this and lets users disable or wipe it at any time.
