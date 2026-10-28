import { useCallback, useEffect, useRef, useState } from 'react'

import { digestBlob, ALL_DIGESTS } from '@/core/engines/hash/digests'
import type { HashedItem } from '@/core/engines/hash/manifest'

import { compareToBaseline, saveBaseline, type BaselineRecord } from './baselineStore'
import { type HashQueueItem, toEvidencePath } from './types'

import type { DigestAlgorithm } from '@/core/engines/hash/digests'

export function useFileHashQueue(algorithms: readonly DigestAlgorithm[] = ALL_DIGESTS) {
  const [items, setItems] = useState<HashQueueItem[]>([])
  const controllers = useRef(new Map<string, AbortController>())

  const runJob = useCallback((item: HashQueueItem) => {
    const controller = new AbortController()
    controllers.current.set(item.id, controller)
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, status: 'hashing', progress: 0 } : row)),
    )

    void digestBlob(item.file, {
      algorithms,
      signal: controller.signal,
      onProgress: (fraction) => {
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, progress: fraction } : row)),
        )
      },
    })
      .then((result) => {
        const hashedAt = new Date().toISOString()
        const baseline = compareToBaseline(
          item.path,
          item.file.size,
          item.file.lastModified,
          result.digests,
        )
        setItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? { ...row, status: 'done', progress: 1, result, hashedAt, baseline }
              : row,
          ),
        )
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setItems((current) =>
          current.map((row) =>
            row.id === item.id
              ? {
                  ...row,
                  status: 'error',
                  error: cause instanceof Error ? cause.message : 'Hashing failed.',
                }
              : row,
          ),
        )
      })
      .finally(() => {
        controllers.current.delete(item.id)
      })
  }, [algorithms])

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => {
    controllers.current.forEach((c) => c.abort())
    controllers.current.clear()
    setItems([])
  }, [])

  const enqueue = useCallback(
    (files: File[]) => {
      if (files.length === 0) return
      const next: HashQueueItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        path: toEvidencePath(file),
        status: 'pending',
        progress: 0,
      }))
      setItems((current) => [...current, ...next])
      next.forEach(runJob)
    },
    [runJob],
  )

  const pinBaseline = useCallback((item: HashQueueItem) => {
    if (!item.result) return
    const record: BaselineRecord = {
      path: item.path,
      size: item.file.size,
      lastModified: item.file.lastModified,
      digests: item.result.digests,
      savedAt: new Date().toISOString(),
    }
    saveBaseline(record)
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, baseline: 'match' } : row)),
    )
  }, [])

  useEffect(
    () => () => {
      controllers.current.forEach((c) => c.abort())
      controllers.current.clear()
    },
    [],
  )

  const hashedItems: HashedItem[] = items
    .filter((item) => item.status === 'done' && item.result)
    .map((item) => ({
      id: item.id,
      path: item.path,
      digests: item.result!.digests,
    }))

  return { items, enqueue, remove, clear, pinBaseline, hashedItems }
}
