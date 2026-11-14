# One Panel Mobile Simulator — acceptance report

## Implementation summary

- Removed WebMobileFirst import pipeline, proprietary font, and MF frame metadata from the service worker bundle.
- Overlay uses One Panel navy/purple styling and inline SVG rail/category icons.
- MIT `open-device-frame` WebPs + CSS chassis remain the legal photoreal path; `catalog-mockups.generated.ts` maps catalog phones to frames.
- Overlay compare splits this tab into two matching simulators with the same rail options; Studio still hosts the multi-device grid.

## Code replacement

See [audit-de-mf.md](./audit-de-mf.md).

## Build and tests

Run locally:

- `npm test -- tests/responsive-viewer.test.ts`
- `npm run build` (includes `check-simulator-fingerprints` and startup budget)

## Known limitations

- Many catalog devices (tablets, Galaxy, watches) use CSS chassis only until additional OSS frames are added.
- Embedded site preview fails when sites send `X-Frame-Options` or restrictive CORP headers (framing rules help but do not bypass intentional embed blocks).
- Live tab emulation shows Chrome’s debugging banner and is not a physical iOS/Android device.
- Recording is WebM-oriented; MP4/GIF export not implemented.
- Pause/resume for tab recording depends on browser MediaRecorder support.