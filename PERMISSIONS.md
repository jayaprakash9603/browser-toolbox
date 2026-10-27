# Permissions

The extension installs with no site access. Anything that runs on web pages or reads sensitive data asks Chrome for permission when the user turns the feature on. Keep this file in sync with `manifest.config.ts` and `website/src/content/permissions.ts`.

## Required

| Permission       | Why                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sidePanel`      | The side panel is the primary UI of the extension.                                                                                                                                                                          |
| `storage`        | Settings, favorites, recent tools and clipboard history persist in `chrome.storage.local`. Short-lived tool handoffs (context-menu picks, element-picker results) use `chrome.storage.session` and expire within 5 minutes. |
| `clipboardWrite` | Copy buttons write results to the clipboard.                                                                                                                                                                                |
| `contextMenus`   | The right-click menu launches tools with the current selection, link, image or page as payload.                                                                                                                             |
| `activeTab`      | Page tools and the element picker run on the current tab after the user clicks the toolbar icon, a menu item or a keyboard shortcut.                                                                                        |
| `scripting`      | Injects page tools on demand, and registers ad-blocking, protection and site add-on scripts while those features are on and site access is granted.                                                                         |
| `tabs`           | Reads the active tab and powers Tab Manager and Browser Toolkit. Tasks reads the active tab's URL, title and favicon to offer "save this page", only while the panel is open.                                                |
| `downloads`      | Saves screenshots, converted images, page bundles and exports. When web protection is on, the download guard cancels files from known threat hosts.                                                                         |
| `offscreen`      | Recording streams, blobs and audio playback that a service worker cannot handle.                                                                                                                                            |
| `tabCapture`, `desktopCapture` | Screen Recorder records the current tab, or a window or screen picked in Chrome's chooser.                                                                                                                    |
| `declarativeNetRequest` | Bundled static rules block ads and trackers, and dynamic rules block known threat hosts, only after the user turns ad blocking or web protection on (both are off by default).                                       |
| `declarativeNetRequestFeedback` | Per-tab blocked-request counts on the badge and in the Ad Blocker tool.                                                                                                                                      |
| `webNavigation`  | Redirect Tracer follows navigation hops; web protection checks tabs that pages open on their own.                                                                                                                           |
| `alarms`         | Timers, Tasks reminders, the internet monitor, scheduled WhatsApp messages and Script Studio update checks.                                                                                                                 |
| `notifications`  | Timer, task reminder and "saved" notifications.                                                                                                                                                                             |

## Optional (requested at runtime)

| Permission | When it is requested |
| ---------- | -------------------- |
| `<all_urls>` (optional host permission) | Turning on ad blocking, web protection, page clipboard capture, PiP auto mode or React DevTools; starting Link Checker, Image Downloader or HTML Bundle jobs. Site add-ons request only their own sites (YouTube, Instagram, WhatsApp Web). The Site access bar in page tools offers "Allow on this site" (one origin) or "All sites". The API Request Builder and WhatsApp webhooks request only the host the user entered. Revocable in Settings › Website access. |
| `clipboardRead` | First Paste / Read clipboard action in a tool (`ensureClipboardReadPermission`). |
| `webRequest` | The "Allow access" prompt in HTTP Interceptor, needed for its network log. Observes only; listeners are attached only after the grant. |
| `userScripts` | Enabling Script Studio or HTTP Interceptor "Insert script" rules. Runs only scripts the user installs or writes, through `chrome.userScripts`. |
| `cookies` | Enabling `GM_cookie` for Script Studio scripts. |
| `debugger` | Turning on Deep intercept and attaching to a tab (Chrome shows its debugging banner). |

`src/core/permissions/siteAccess.ts` holds the request helpers. The background worker listens to `chrome.permissions.onAdded` and re-syncs content script registrations, so features start working in open tabs without a reload.

## Defaults

- Ad blocking, web protection, page clipboard capture, PiP auto mode, React DevTools, the internet monitor and every site add-on are **off** after install.
- Clipboard history records text copied inside One Panel. Capturing copies made on web pages is a separate switch that is off by default.
- SponsorBlock, Return YouTube Dislike and WhatsApp translation are off by default.

## Data that leaves the device

Only when the user starts a tool or turns a feature on:

- API Request Builder, Link Checker, Redirect Tracer, Image Downloader, HTML Bundle: the hosts the user targets.
- Speed test: `speed.cloudflare.com`, `ipwho.is`, `api.bigdatacloud.net`.
- SEO PageSpeed: page URL to `www.googleapis.com/pagespeedonline`.
- Internet monitor: the ping URL the user chooses, and `api.ipify.org` when "Show IP" is on.
- SponsorBlock / Return YouTube Dislike: video ID to `sponsor.ajay.app` / `returnyoutubedislikeapi.com`.
- WhatsApp translation: the message text to `translate.googleapis.com`.
- WhatsApp webhooks: a test event to the URL the user adds (no message content).
- Script Studio: script install and update URLs, plus hosts that scripts are granted via `@connect`.

There is no analytics, no account and no server operated by the developer. Web protection uses bundled lists; no URLs are sent to a third party.

## Code execution

The extension's own code and filter lists ship in the package. Script Studio and HTTP Interceptor "Insert script" rules run user-installed or user-written scripts only through `chrome.userScripts`, which Chrome gates behind the optional permission and the "Allow user scripts" toggle. HTTP Interceptor rule bodies written by the user are evaluated locally.

## Deliberately not requested

`history`, `bookmarks`, `sessions`, `identity`, `geolocation`.
