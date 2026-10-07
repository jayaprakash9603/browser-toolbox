# Roadmap

**Positioning:** One trusted Chrome extension that replaces dozens of tiny utilities — **Developer + QA + web productivity**, local-first, search-first. Success is measured by **search, favorites, and smart-paste usage**, not raw tool count.

**Current baseline:** See the capability matrix in [TOOLS.md](./TOOLS.md).

---

## Phase 1 — Product truth (complete)

- Document shipped vs partial vs deferred capabilities
- Legacy route table and hygiene (orphan paths, accurate storage copy)
- README aligned with actual feature set

---

## Phase 2 — Differentiators (next implementation cycle)

High impact without external lookup APIs:

| Item | Rationale |
| ---- | --------- |
| **JSON Diff tab** | Wire existing `diffJsonValues` in JSON Toolkit |
| **Smart paste 2.0** | Route JSON → `developer.json-toolkit`; regex detection; multi-action chips (format · validate · minify) |
| **Bug capture flow** | Link Bug Reporter + Capture Toolkit (screenshot + environment block) |
| **Cookies in Storage Inspector** | `chrome.cookies` + clear UX, or keep storage-only copy (Phase 1 chose accurate copy until built) |
| **Screenshot depth** | Full-page and/or element capture (spike Chrome APIs + stitching) |

---

## Phase 3 — QA & web depth (user-initiated, local)

- Broken-link check on current page (bounded concurrency)
- HTTP response headers for active tab where permitted
- Standalone JSON compare UX (reuse API/json diff engines)
- SEO: fetch `robots.txt` / sitemap for **current origin** only (no third-party DNS)

---

## Phase 4 — Productivity expansion

- Bookmarks search / export
- Tab session export-import; optional suspend
- Notes: tags + export

---

## Phase 5 — Large epics

- Responsive viewport lab (device presets, orientation)
- Pixel / screen ruler overlays
- Lightweight technology detection (DOM/script heuristics, not full Wappalyzer clone)
- Optional **AI module** (off by default, external API, privacy gate)

---

## Explicit exclusions

- Third-party **DNS / WHOIS / SSL / redirect** SaaS
- Generic **translation** product scope
- **JWT sign/verify** with production secrets in-extension (unless deliberately scoped later)
- Marketing as “100+ tools” instead of **one install, everything you need**

---

## How to propose a feature

1. Map it to a **user job** (e.g. “file a bug with screenshot”) not a checkbox.
2. Prefer extending an existing **toolkit** + **engine** over a new registry row.
3. Document permissions in [PERMISSIONS.md](./PERMISSIONS.md) before shipping.
