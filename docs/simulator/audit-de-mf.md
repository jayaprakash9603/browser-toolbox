# Mobile Simulator — de-MF audit (One Panel)

**Date:** 2026-11-14  
**Reference extension (workflow only, not redistributed):** `ckejmhbmlajgoklhgbapkiccekfoccmk` (WebMobileFirst Mobile Simulator)

This document records proprietary or reference-tied material found in the One Panel codebase and the replacement chosen. After the independent rebuild, committed source must not contain the banned patterns enforced by `scripts/check-simulator-fingerprints.mjs`.

## 1. Confirmed copied or reference-tied material (removed)

| Item | Evidence | Risk | Replacement |
|------|----------|------|-------------|
| MF device PNG→WebP import | `scripts/import-mf-simulator.py`, `npm run simulator:import-mf`, `public/simulator/mf/` | Proprietary bezels | MIT `open-device-frame` WebPs + CSS chassis |
| MF metadata in bundle | `mf-*.generated.ts`, `mockups.ts` MF paths | Slugs tied to MF assets | `catalog-mockups.generated.ts` from MIT frames only |
| icomoon.ttf from MF | `public/simulator/fonts/icomoon.ttf`, LICENSE | Non-redistributable font | Inline Lucide-style SVGs in `overlayIcons.ts` |
| MF glyph codepoints | `overlayRail.ts` `\ue9xx` | Icon fingerprint | `overlayIcons.ts` |
| webmobilefirst.com links | `overlayMount.ts` help panel | Branding | One Panel in-app help copy + studio link |
| MF accent/canvas tokens | `#539fff`, `#eceff3` parity styling | Visual fingerprint | One Panel navy/purple `--tbx-accent` tokens |

## 2. Verified legal assets (retained)

| Asset | License | Location |
|-------|---------|----------|
| open-device-frame WebPs | MIT | `public/simulator/frames/`, `LICENSE.txt` |
| CSS chassis geometry | MIT (attribution in LICENSE) | `chassis.ts`, `frames.tsx` |

## 3. Original One Panel implementation (retained)

- Device catalog: `catalog.ts`, `devices.ts`
- Studio multi-device + compare URL: `Studio.tsx`
- CDP emulation with user consent: `emulation.ts`
- Overlay session, framing DNR rules, capture/record: `overlayService.ts`, `overlayMount.ts`
- Context menus: `menus.ts`, `openSimulator.ts`

## 4. Components replaced independently

- Rail and category icons → Lucide-style SVG strings
- Mockup resolution → MIT catalog map only (no `simulator/mf/`)
- Help center content → One Panel strings (i18n keys)

## 5. Manual review checklist

- [ ] Any new frame added from an external repo has LICENSE committed before merge
- [ ] `npm run build` passes `check-simulator-fingerprints`
- [ ] Chrome Web Store listing does not imply affiliation with WebMobileFirst