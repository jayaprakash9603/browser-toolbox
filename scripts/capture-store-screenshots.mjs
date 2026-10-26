/**
 * Capture Chrome Web Store screenshots (1280×800 PNG) from a production preview build.
 * Usage: node scripts/capture-store-screenshots.mjs
 * Requires: dist/ built, npx playwright (chromium) on first run.
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'releases', 'store-screenshots')
const port = 4173
const base = `http://127.0.0.1:${port}/index.html`
const panelWidth = 420
const storeW = 1280
const storeH = 800

const chromeMock = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'store-screenshot-chrome-mock.js'), 'utf8')

const shots = [
  { file: '01-home.png', hash: '#/', wait: 'Browse by category', extra: null },
  {
    file: '02-json-toolkit.png',
    hash: '#/tools/developer/json-toolkit',
    wait: 'JSON Toolkit',
    extra: null,
  },
  {
    file: '03-command-palette.png',
    hash: '#/',
    wait: 'Browse by category',
    extra: async (page) => {
      await page.getByRole('button', { name: /open command palette/i }).click()
      await page.waitForTimeout(600)
    },
  },
  {
    file: '04-web-protection.png',
    hash: '#/tools/privacy/web-protection',
    wait: 'Web protection',
    extra: null,
  },
  {
    file: '05-script-studio.png',
    hash: '#/tools/sites/script-studio',
    wait: 'Script Studio',
    extra: null,
  },
  {
    file: '06-settings.png',
    hash: '#/settings',
    wait: 'Settings',
    extra: null,
  },
  {
    file: '07-element-inspector.png',
    hash: '#/tools/qa/element-inspector',
    wait: 'Element',
    extra: null,
  },
]

function waitForPreview(url, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve()
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) reject(new Error('Preview server did not start'))
      else setTimeout(tick, 400)
    }
    tick()
  })
}

function startPreview() {
  const child = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'pipe', shell: process.platform === 'win32' },
  )
  return child
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const preview = startPreview()
  preview.stderr?.on('data', (d) => process.stderr.write(d))
  preview.stdout?.on('data', (d) => process.stdout.write(d))

  try {
    await waitForPreview(`http://127.0.0.1:${port}/`)
  } catch (e) {
    preview.kill()
    throw e
  }

  const { chromium } = await import('playwright')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: storeW, height: storeH },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  })

  await context.addInitScript(chromeMock)
  await context.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = `
      html { background: #d4d7dc !important; }
      body { margin: 0 !important; background: #d4d7dc !important; overflow: hidden !important; }
      #root {
        width: ${panelWidth}px !important;
        max-width: ${panelWidth}px !important;
        min-height: 100vh !important;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.06), 8px 0 32px rgba(0,0,0,0.12);
        background: hsl(var(--background, 0 0% 100%));
      }
    `
    document.documentElement.appendChild(style)
  })

  const page = await context.newPage()

  for (const shot of shots) {
    const url = `${base}${shot.hash}`
    console.log(`Capturing ${shot.file} …`)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 })
    await page.waitForTimeout(1500)
    try {
      await page.getByText(shot.wait, { exact: false }).first().waitFor({ timeout: 25_000 })
    } catch {
      console.warn(`  (soft wait) selector not found for ${shot.file}, capturing anyway`)
    }
    if (shot.extra) await shot.extra(page)
    await page.waitForTimeout(400)
    await page.screenshot({
      path: join(outDir, shot.file),
      type: 'png',
      fullPage: false,
    })
  }

  await browser.close()
  preview.kill()
  console.log(`\nDone. Screenshots: ${outDir}`)
  console.log('Upload as 1280×800 PNG on the Chrome Web Store listing.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
