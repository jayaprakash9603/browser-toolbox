#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const targetDir = join(root, 'dist', 'chromium')
const requested = (process.env.BROWSER_SMOKE_TARGETS || 'chrome,edge,brave,opera')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

if (!existsSync(join(targetDir, 'manifest.json'))) {
  throw new Error('Build the Chromium target first with npm run build:chromium.')
}

const manifest = JSON.parse(readFileSync(join(targetDir, 'manifest.json'), 'utf8'))
const executableByBrowser = {
  chrome: process.env.CHROME_BIN,
  edge: process.env.EDGE_BIN,
  brave: process.env.BRAVE_BIN,
  opera: process.env.OPERA_BIN,
}

async function runChromiumSmoke(browserName, executablePath) {
  if (!executablePath) {
    console.log(`${browserName}: skipped (set ${browserName.toUpperCase()}_BIN to run it)`)
    return
  }

  const context = await chromium.launchPersistentContext('', {
    executablePath,
    headless: process.env.BROWSER_SMOKE_HEADFUL !== '1',
    args: [`--disable-extensions-except=${targetDir}`, `--load-extension=${targetDir}`],
  })
  try {
    let worker = context.serviceWorkers()[0]
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 30_000 })
    }
    const extensionId = new URL(worker.url()).hostname
    if (!extensionId) throw new Error('Could not determine the loaded extension ID.')

    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/index.html`, { waitUntil: 'domcontentloaded' })
    if ((await page.title()) !== 'One Panel') {
      throw new Error(`Unexpected extension page title: ${await page.title()}`)
    }
    console.log(`${browserName}: loaded ${manifest.version} (${extensionId})`)
  } finally {
    await context.close()
  }
}

for (const browserName of requested) {
  const executablePath = executableByBrowser[browserName]
  if (!(browserName in executableByBrowser)) {
    console.warn(`${browserName}: unknown Chromium smoke target`)
    continue
  }
  await runChromiumSmoke(browserName, executablePath)
}

console.log('Firefox/Tor smoke testing is performed with the Firefox artifact and the documented ESR matrix.')

