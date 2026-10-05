# Permissions

Phase 1 requests the minimum set required for the implemented features.

| Permission | Why |
| --- | --- |
| `sidePanel` | The side panel is the primary UI of the extension. |
| `storage` | Settings, favorites, recent tools and clipboard history persist in `chrome.storage.local`. |
| `clipboardRead` | Clipboard tools read the current clipboard text on user action (button, paste, panel focus). |
| `clipboardWrite` | "Copy again" / copy-result actions write to the clipboard. |
| `contextMenus` | The background worker manages the "Open Browser Toolbox" menu and future per-tool actions. |

## Deliberately NOT requested

- `activeTab`, `tabs`, `scripting`, host permissions — content-script tools (element picker, XPath, CSS selectors) are Phase 3+ and will add permissions when they ship.
- `clipboardRead` is never used to exfiltrate data: clipboard contents are processed locally and stored only on-device, with a disable switch, size limit and clear-all in Settings.

## Privacy

- No network calls. No analytics. No remote code or remote fonts.
- Clipboard history may contain sensitive text — the Settings page warns about this and lets users disable or wipe it at any time.
