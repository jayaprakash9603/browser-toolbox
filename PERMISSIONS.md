# Permissions

The extension requests the minimum set required for the implemented features. Each permission below is in use by shipped functionality.

| Permission | Why |
| --- | --- |
| `sidePanel` | The side panel is the primary UI of the extension. |
| `storage` | Settings, favorites, recent tools and clipboard history persist in `chrome.storage.local`. Short-lived tool handoffs (context-menu picks, element-picker results) use `chrome.storage.session` and expire within 5 minutes. |
| `clipboardRead` | Clipboard tools read the current clipboard text on user action (button, paste, panel focus) and for the optional "Analyze clipboard" suggestions on the home screen. |
| `clipboardWrite` | "Copy again" / copy-result actions write to the clipboard. |
| `contextMenus` | The right-click "Toolbox" menu (grouped by Text / Developer / QA / Page / Color) launches tools with the current selection, link, image or page as payload. |
| `activeTab` | Lets the element picker and page tools run on the tab you explicitly interact with — only after a keyboard command or menu click. |
| `scripting` | Injects the content script on demand (element picker, page info, storage snapshot). No persistent content scripts run on pages. |

## Deliberately NOT requested

- `tabs`, `cookies`, `bookmarks`, `sessions`, `alarms` — Tab Manager, Storage Inspector and Productivity tools will add these only when those phases ship.
- Broad host permissions (`<all_urls>`) — page access is granted per-tab via `activeTab` at the moment of use.
- `clipboardRead` is never used to exfiltrate data: clipboard contents are processed locally and stored only on-device, with a disable switch, size limit and clear-all in Settings.

## Privacy

- No network calls. No analytics. No remote code or remote fonts.
- Element-picker results and context-menu payloads stay in `chrome.storage.session` on this device and expire after 5 minutes.
- Clipboard history may contain sensitive text — the Settings page warns about this and lets users disable or wipe it at any time.
