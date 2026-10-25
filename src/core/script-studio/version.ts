/** Compare userscript semver-ish versions. Returns 1 if a>b, -1 if a<b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((part) => {
        const n = parseInt(part, 10)
        return Number.isNaN(n) ? part : n
      })

  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0
    const vb = pb[i] ?? 0
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va > vb) return 1
      if (va < vb) return -1
    } else {
      const sa = String(va)
      const sb = String(vb)
      if (sa > sb) return 1
      if (sa < sb) return -1
    }
  }
  return 0
}

export function isNewerVersion(remote: string, local: string): boolean {
  return compareVersions(remote, local) > 0
}
