# Chrome Web Store listing

Paste-ready text for the developer dashboard. Copy each block as plain text; the store does not render Markdown.

Rules this text follows (Chrome Web Store spam and keyword-stuffing policy, violation "Yellow Argon"):

- No lists of languages, formats, audiences, sites or brands, and no "keywords" line.
- No word repeated unnaturally; the description names the product once and links the website once.
- No testimonials, ratings or claims that cannot be checked.
- Permissions are described as they ship: site access and sensitive APIs are optional and requested when a feature is turned on.

Keep `extDescription` in `public/_locales/en/messages.json` and `src/core/i18n/chromeMessages.ts` identical to the summary below.

## Summary (132 characters max)

```text
Everyday developer, text and web tools in one searchable Chrome side panel. Works on your device; site features are opt-in.
```

## Detailed description

```text
One Panel puts the small utilities you reach for every day into Chrome's side panel, so you can tidy up some data, pick a color or capture a screenshot without opening another website or installing another extension.

Open the panel from the toolbar icon and type what you need into the search box. The matching tool opens next to the page you are working on. Pin the ones you use most to the home screen, or right-click selected text, a link or an image to send it straight to the right tool.

WHAT YOU CAN DO

Work with data and code: format and validate structured data, convert it between formats, test regular expressions, decode tokens, and generate IDs and hashes. Processing happens on your device.

Clean up text: change case, compare two versions side by side, find and replace, and search a history of the text you copy inside the panel.

Inspect and test websites: pick an element to get a reliable selector, review metadata and links, trace redirects, and send HTTP requests while you debug an API.

Capture and edit: take a screenshot of the visible area or a selection, annotate it, record the current tab, and resize or convert images.

Stay organised: keep notes, set timers and reminders, manage open tabs, and create or scan QR codes.

OPTIONAL FEATURES, OFF UNTIL YOU TURN THEM ON

A few features act on the websites you visit. They are off after install, and Chrome asks for your permission when you enable one:

• An ad and tracker blocker that uses filter lists bundled with the extension.
• Web protection that warns you about known phishing and malware sites using bundled lists, without sending your browsing anywhere.
• An HTTP interceptor for developers that can redirect, mock or delay requests.
• A user script manager. Scripts you install or write run only through Chrome's user scripts API, after you allow it in Chrome's extension settings.
• Add-ons for a few popular websites, such as extra playback controls on YouTube.

You can review or remove site access at any time in Settings.

PRIVACY

There is no account, no analytics and no server run by the developer. Your settings, notes and history stay in local storage on your device. A tool goes online only when you ask it to, for example when you send an API request or check a page for broken links. The privacy policy explains each case: https://onepanel.quickcalci.com/privacy/
```

## Single purpose

```text
One Panel is a side panel of everyday browser utilities. Every feature is a tool opened from that panel to work with text, data or the current tab. Features that act on websites are off by default and ask for site access when the user turns them on.
```

## Permission justifications

```text
sidePanel: The extension's whole interface is a side panel where the user searches for and opens tools.

storage: Saves settings, pinned and recent tools, notes, timers and clipboard history locally on the device.

clipboardWrite: Copy buttons put tool results, such as formatted text, colors and screenshots, on the clipboard.

contextMenus: Adds right-click items that send the selected text, link, image or page to a tool.

activeTab: Runs a page tool, such as the element picker or screenshot, on the current tab only after the user clicks the toolbar icon, a menu item or a keyboard shortcut.

scripting: Injects the page tool the user starts, and registers the ad blocker, web protection and site add-on scripts only while the user has those features on and has granted site access.

tabs: Tab Manager lists open tabs with their titles, addresses and icons, and other tools read the current tab's address to work on it.

downloads: Saves screenshots, converted images, page bundles and exports to the user's computer. When web protection is on, it also cancels downloads from known malicious hosts.

offscreen: Handles screen recording streams, file conversion and audio playback that the background service worker cannot do.

tabCapture: Screen Recorder records the current tab when the user starts a recording.

desktopCapture: Screen Recorder records a window or the screen that the user picks in Chrome's chooser.

declarativeNetRequest: Applies the bundled ad and tracker rules and the known-threat rules only after the user turns on ad blocking or web protection, and applies HTTP interceptor rules the user creates. While Responsive Viewer is open, it removes frame-blocking headers only for frames inside the extension so previews can load. A site add-on the user enables can block a single request, such as Instagram's story "seen" receipt.

declarativeNetRequestFeedback: Shows how many requests were blocked on the current tab in the toolbar badge and the Ad Blocker tool.

alarms: Fires timers, task reminders, scheduled messages and periodic script update checks.

notifications: Tells the user when a timer ends, a reminder is due or a file has been saved.

webNavigation: Redirect Tracer follows each hop of a navigation, and web protection checks tabs that pages open on their own.

Host permission (optional, all sites): Requested only when the user turns on a feature that works on web pages, such as ad blocking or web protection. The user can allow a single site instead of all sites and can revoke access in Settings.

clipboardRead (optional): Requested the first time the user clicks a paste or read-clipboard button in a tool.

webRequest (optional): Requested when the user opens the HTTP interceptor's network log, which only observes requests.

userScripts (optional): Requested when the user enables the user script manager or an interceptor "insert script" rule. Runs only scripts the user installs or writes.

cookies (optional): Requested only when a user script the user installed asks for cookie access.

debugger (optional): Requested when the user turns on the HTTP interceptor's deep intercept mode for a tab. Chrome shows its debugging banner while it is attached.

bookmarks (optional): Requested only when the user opens the Bookmark Search tool. Reads Chrome bookmarks on this device so the user can search titles and URLs, open a bookmark, and export a list as Markdown or JSON. One Panel does not create, edit or delete bookmarks, and bookmark data is never uploaded or shared.
```

## Remote code

Answer: **No, I am not using remote code.**

```text
All extension logic, filter lists and threat lists are bundled in the package. The only user-provided code is scripts the user installs or writes in the user script manager or an interceptor "insert script" rule, and these run only through the chrome.userScripts API after the user enables it.
```
