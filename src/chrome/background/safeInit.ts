import { createLogger } from '@/core/logging'

const logger = createLogger('background')

/** Runs feature registration without letting one failure block others. */
export function safeRegister(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn()
    if (result && typeof (result as Promise<void>).catch === 'function') {
      void (result as Promise<void>).catch((error: unknown) => {
        logger.error(`${name} failed`, error)
      })
    }
  } catch (error) {
    logger.error(`${name} failed`, error)
  }
}

/** Runs an async startup step; logs and swallows errors. */
export function safeStartup(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn()
    if (result && typeof (result as Promise<void>).then === 'function') {
      void (result as Promise<void>).catch((error: unknown) => {
        logger.warn(`${name} failed`, error)
      })
    }
  } catch (error) {
    logger.warn(`${name} failed`, error)
  }
}
