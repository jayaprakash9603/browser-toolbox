import {
  GALLERY_SCRIPTS,
  galleryInstallUrl,
  getScriptCode,
  getScriptStudioIndex,
  isNewerVersion,
  parseMetadata,
  upsertScriptRecord,
} from '@/core/script-studio'

/** Replaces installed gallery scripts with the bundled copy when the gallery ships a newer version. */
export async function upgradeGalleryScripts(): Promise<number> {
  const index = await getScriptStudioIndex()
  let upgraded = 0
  for (const record of index.scripts) {
    if (record.trashed || !record.installUrl) continue
    const item = GALLERY_SCRIPTS.find((s) => galleryInstallUrl(s.id) === record.installUrl)
    if (!item) continue
    const latest = parseMetadata(item.code)?.version
    const code = await getScriptCode(record.id)
    const installed = code ? parseMetadata(code)?.version : undefined
    if (!latest || !installed || !isNewerVersion(latest, installed)) continue
    await upsertScriptRecord({ ...record, name: item.name, version: latest }, item.code)
    upgraded++
  }
  return upgraded
}
