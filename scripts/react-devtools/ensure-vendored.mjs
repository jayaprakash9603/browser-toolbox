#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const main = join(root, 'public', 'react-devtools', 'build', 'main.js')

if (!existsSync(main)) {
  console.error(
    '\n[react-devtools] Missing vendored bundle at public/react-devtools/build/main.js\n' +
      'React DevTools panels will not appear until you run:\n\n' +
      '  npm run react-devtools:vendor -- --skip-fetch\n\n' +
      '(First run can take 20–40 minutes while the React monorepo builds. ' +
      'On Windows, set NODE_ENV=development if install skips devDependencies.)\n',
  )
  process.exit(1)
}
