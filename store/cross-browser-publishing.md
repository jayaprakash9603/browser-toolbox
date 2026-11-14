# One Panel cross-browser publishing

This repository produces one release matrix from the version in `package.json`.

## Artifacts

Run the complete local preflight:

```text
npm ci
npm run lint
npm test
npm run typecheck
npm run build:all
npm run validate:targets
npm run lint:firefox
npm run package:all
```

The output is written under `releases/v<version>/`:

- `one-panel-v<version>-chrome.zip`
- `one-panel-v<version>-edge.zip`
- `one-panel-v<version>-opera.zip`
- `one-panel-v<version>-brave.zip`
- `one-panel-v<version>-firefox.zip`
- `SHA256SUMS.txt`
- `one-panel-v<version>-notes.txt`

The four Chromium archives are copies of one validated build and must have the same SHA-256 hash. Brave desktop uses the Chrome Web Store distribution path, so it does not need a separate Brave-only manifest.

The Firefox ZIP is the AMO upload package. A signed `.xpi` is only produced by Mozilla after signing; do not rename an unsigned ZIP and call it signed.

## Store requirements

### Chrome Web Store

Official guidance: <https://developer.chrome.com/docs/webstore/prepare>

- Upload the Chrome ZIP with `manifest.json` at the archive root.
- Keep Manifest V3 and increase the version for every update.
- Confirm the localized description, icons, single-purpose statement, privacy disclosures, permissions rationale, screenshots, support URL, and privacy policy.
- Test the exact packed ZIP before uploading it.
- Upload through the Chrome Developer Dashboard and submit it for review.

### Microsoft Edge Add-ons

Official guidance: <https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension>

- Register a Microsoft Partner Center extension developer account.
- Upload the Edge ZIP to the existing product entry.
- Keep the Edge product ID and use the same reviewed Chromium artifact.
- Supply certification notes explaining optional permissions, site access, recording, interception, and local-only processing.

### Opera Add-ons

Official guidance: <https://help.opera.com/en/extensions/publishing-guidelines/>

- Create or use an Opera Add-ons developer account.
- Upload the Opera ZIP through the developer repository.
- Supply listing metadata, license, screenshots, translations, and reviewer notes.
- Test the side-panel fallback in Opera before submission; if Opera lacks the native side panel API, the extension opens its normal extension page.

### Brave

- Distribute the Chromium artifact through the Chrome Web Store.
- Test installation and toolbar behavior in Brave stable.
- Test Shields-enabled pages, permission prompts, content-script injection, downloads, recording, and DNR behavior.
- Do not claim a separate Brave store listing or maintain a divergent Brave manifest unless a future Brave distribution channel requires one.

### Firefox

Official guidance: <https://extensionworkshop.com/documentation/publish/submitting-an-add-on/>

- Set `FIREFOX_EXTENSION_ID` to the permanent AMO ID before the first public submission. The default ID is only a stable repository fallback.
- Upload `one-panel-v<version>-firefox.zip` to AMO or sign it with `web-ext`.
- Keep the Firefox MV3 manifest's `browser_specific_settings.gecko.id`, `strict_min_version`, `sidebar_action`, and non-persistent background scripts.
- Upload `store/firefox-icon-128.png` as the AMO listing icon at <https://addons.mozilla.org/en-US/developers/addon/one-panel/edit>. AMO does not replace the default puzzle piece from the XPI after the first listing is created.
- Address AMO warnings about dynamic code, permissions, data handling, and unsupported APIs before submitting.
- Keep AMO JWT credentials out of Git and use CI secrets only if automated signing is enabled later.

For a listed AMO release, the later optional signing command is:

```text
web-ext sign --channel=listed --amo-metadata=store/firefox-amo-metadata.json --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

## Tor Browser

Tor Browser has no separate extension store or supported publication channel for this project. It is based on Firefox, so the Firefox artifact can be tested as an optional manual configuration, but the Tor Project strongly discourages additional add-ons because they can change the browser fingerprint, weaken privacy, and interfere with security settings.

Test the Firefox artifact against the exact Tor ESR family only when explicitly needed:

- Standard, Safer, and Safest security levels
- private windows and first-party isolation
- denied and granted site permissions
- regular HTTPS and `.onion` pages
- letterboxing and restricted JavaScript
- content scripts, DNR, downloads, capture, and sidebar behavior

Release notes must describe Tor as an unsupported compatibility test target, not as a Tor-endorsed publication.

## Release checklist

- [ ] `package.json`, both generated manifests, and all archive names use the same version.
- [ ] `npm run validate:targets` passes.
- [ ] `npm run lint:firefox` passes with zero errors.
- [ ] Chromium aliases have identical SHA-256 values.
- [ ] The ZIP opens with `manifest.json` at its root.
- [ ] Chrome, Edge, Opera, Brave, and Firefox versions tested are recorded.
- [ ] Permission and privacy declarations match the package actually uploaded.
- [ ] GitHub Release contains the ZIP files, checksums, notes, and no private keys.
- [ ] AMO signing output is distinguished from the unsigned Firefox ZIP.
- [ ] No Tor publication or support claim is made.

