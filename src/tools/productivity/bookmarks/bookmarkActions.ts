export async function createBookmark(parentId: string, title: string, url: string, index?: number) {
  return chrome.bookmarks.create({ parentId, title, url, index })
}

export async function createFolder(parentId: string, title: string) {
  return chrome.bookmarks.create({ parentId, title })
}

export async function updateBookmark(id: string, changes: { title: string; url: string }) {
  return chrome.bookmarks.update(id, changes)
}

export async function renameFolder(id: string, title: string) {
  return chrome.bookmarks.update(id, { title })
}

export async function moveBookmark(id: string, destination: { parentId?: string; index?: number }) {
  return chrome.bookmarks.move(id, destination)
}

export async function removeBookmark(id: string) {
  return chrome.bookmarks.remove(id)
}

export async function removeFolder(id: string) {
  return chrome.bookmarks.removeTree(id)
}

/** Fires on any bookmark change, including ones made in Chrome itself. */
export function watchBookmarks(onChange: () => void): () => void {
  const events = [
    chrome.bookmarks?.onCreated,
    chrome.bookmarks?.onRemoved,
    chrome.bookmarks?.onChanged,
    chrome.bookmarks?.onMoved,
  ].filter(Boolean)
  events.forEach((event) => event.addListener(onChange))
  return () => events.forEach((event) => event.removeListener(onChange))
}
