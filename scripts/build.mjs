import { spawn, spawnSync } from 'node:child_process'
import { delimiter, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = { ...process.env, PATH: `${resolve(root, 'node_modules/.bin')}${delimiter}${process.env.PATH}` }
const children = new Set()

function run(label, command) {
  const started = performance.now()
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, { cwd: root, env, shell: true, stdio: 'inherit' })
    children.add(child)
    child.on('exit', (code) => {
      children.delete(child)
      const seconds = ((performance.now() - started) / 1000).toFixed(1)
      if (code === 0) {
        console.log(`[build] ${label} done in ${seconds}s`)
        resolvePromise()
      } else {
        reject(new Error(`${label} failed with exit code ${code}`))
      }
    })
  })
}

function stop(child) {
  // On Windows, killing the shell leaves the command it started running.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
  else child.kill()
}

function fail(error) {
  console.error(`[build] ${error.message}`)
  for (const child of children) stop(child)
  process.exit(1)
}

async function main() {
  const started = performance.now()
  // Type-checking only reads src, so it overlaps with asset prep and bundling.
  const typecheck = run('typecheck', 'tsgo -b --checkers 2')
  typecheck.catch(fail)

  await Promise.all([
    run('postman sandbox', 'node scripts/copy-postman-sandbox.mjs'),
    run('whatsapp vendor', 'node scripts/copy-wa-vendor.mjs'),
    run('autofill assets', 'ufa-assets public/form-autofill'),
    run('world map', 'node scripts/build-world-map.mjs'),
    run('page scripts', 'node scripts/build-adblock-scripts.mjs'),
    run('script studio runtime', 'node scripts/build-script-studio-runtime.mjs'),
  ])
  await run('bundle', 'vite build')
  await typecheck
  await run('startup budget', 'node scripts/check-startup-budget.mjs')
  console.log(`[build] finished in ${((performance.now() - started) / 1000).toFixed(1)}s`)
}

main().catch(fail)
