type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> }

function eyeDropperCtor(): EyeDropperCtor | undefined {
  return (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper
}

export function canUseEyeDropper(): boolean {
  return typeof window !== 'undefined' && Boolean(eyeDropperCtor())
}

export type EyeDropperPick = { ok: true; hex: string } | { ok: false; reason: 'cancelled' | 'unavailable' }

/** Opens Chrome's EyeDropper in the current document. Must run in the click/key turn. */
export async function pickWithEyeDropper(): Promise<EyeDropperPick> {
  const Ctor = eyeDropperCtor()
  if (!Ctor) return { ok: false, reason: 'unavailable' }
  try {
    const result = await new Ctor().open()
    const hex = result?.sRGBHex?.trim()
    if (!hex) return { ok: false, reason: 'unavailable' }
    return { ok: true, hex }
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    if (name === 'AbortError') return { ok: false, reason: 'cancelled' }
    return { ok: false, reason: 'unavailable' }
  }
}
