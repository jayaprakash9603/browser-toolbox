const CANDIDATES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const

export function pickMimeType(isSupported: (type: string) => boolean): string {
  for (const type of CANDIDATES) {
    if (isSupported(type)) return type
  }
  return 'video/webm'
}

export function extensionForMime(mimeType: string): 'mp4' | 'webm' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
}

export function baseMime(mimeType: string): string {
  return mimeType.split(';')[0]
}
