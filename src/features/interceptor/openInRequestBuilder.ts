const PENDING_OPEN_REQUEST_KEY = 'postman-lite:pending-open'

export async function openInRequestBuilder(curl: string, name?: string): Promise<void> {
  await chrome.storage.session.set({
    [PENDING_OPEN_REQUEST_KEY]: {
      curl,
      name,
      nonce: crypto.randomUUID(),
    },
  })
  window.location.hash = '/tools/api/request-builder'
}
