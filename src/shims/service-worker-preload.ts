/** Vite's preload helper uses `window`; service workers do not have it. */
export function __vitePreload<T>(importPromise: () => Promise<T>, _deps?: unknown): Promise<T> {
  return importPromise()
}

export default __vitePreload
