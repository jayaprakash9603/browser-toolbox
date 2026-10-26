/**
 * Resize listing images to Chrome Web Store screenshot size (1280×800).
 * Source: releases/store-screenshots/*.png (user creatives)
 * Output: releases/store-screenshots/chrome-web-store/
 */
import { readdir, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'releases', 'store-screenshots')
const outDir = join(srcDir, 'chrome-web-store')

const TARGET_W = 1280
const TARGET_H = 800

/** Upload order on the listing (edit if you prefer another sequence). */
const ORDER = [
  'One Panel Browser Toolkit Dashboard.png',
  'One Panel_ Tools for Every Task.png',
  'One Panel Browser Toolkit Showcase.png',
  'One Panel Developer Toolkit Dashboard.png',
  'One Panel Browser Toolkit Poster.png',
]

function slug(name) {
  return name
    .replace(/\.png$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 48)
}

async function resizeOne(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath)
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const files = await readdir(srcDir)
  const pngs = files.filter((f) => f.toLowerCase().endsWith('.png') && !f.startsWith('0'))

  const ordered = [
    ...ORDER.filter((f) => pngs.includes(f)),
    ...pngs.filter((f) => !ORDER.includes(f)).sort(),
  ]

  let i = 0
  for (const file of ordered) {
    if (file === 'chrome-web-store') continue
    const input = join(srcDir, file)
    i += 1
    const outName = `${String(i).padStart(2, '0')}-${slug(file)}.png`
    const output = join(outDir, outName)
    const meta = await sharp(input).metadata()
    console.log(`${file} (${meta.width}×${meta.height}) → ${outName}`)
    await resizeOne(input, output)
  }

  console.log(`\nDone. Upload PNGs from:\n  ${outDir}\nRequired size: ${TARGET_W}×${TARGET_H}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
