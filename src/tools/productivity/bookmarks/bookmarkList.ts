import {
  childFolders,
  directRows,
  duplicateBookmarkIds,
  filterBookmarkDomain,
  filterBookmarkView,
  rowsInFolderTree,
  searchBookmarkRows,
  sortBookmarkRows,
  type BookmarkFolder,
  type BookmarkLibrary,
  type BookmarkRow,
  type BookmarkSort,
  type BookmarkView,
} from './service'

export interface BookmarkListState {
  query: string
  folderId: string | 'all'
  domain: string | 'all'
  view: BookmarkView
  sort: BookmarkSort
}

export interface BookmarkList {
  current?: BookmarkFolder
  browsing: boolean
  reorderable: boolean
  subfolders: BookmarkFolder[]
  rows: BookmarkRow[]
  scopeRows: BookmarkRow[]
  duplicates: Set<string>
}

export function deriveBookmarkList(
  library: BookmarkLibrary,
  state: BookmarkListState,
): BookmarkList {
  const duplicates = duplicateBookmarkIds(library.rows)
  const current =
    state.folderId === 'all' ? undefined : library.folders.find((f) => f.id === state.folderId)
  const browsing = Boolean(current) && state.query.trim() === ''

  const scopeRows =
    browsing && current
      ? directRows(library.rows, current.id)
      : searchBookmarkRows(
          current ? rowsInFolderTree(library.rows, current) : library.rows,
          state.query,
        )

  const filtered = filterBookmarkDomain(
    filterBookmarkView(scopeRows, state.view, duplicates),
    state.domain,
  )
  const sort = state.sort === 'manual' && !browsing ? 'recent' : state.sort

  return {
    current,
    browsing,
    reorderable: browsing && sort === 'manual' && state.view === 'all' && state.domain === 'all',
    subfolders: browsing && current ? childFolders(library.folders, current.id) : [],
    rows: sortBookmarkRows(filtered, sort),
    scopeRows,
    duplicates,
  }
}
