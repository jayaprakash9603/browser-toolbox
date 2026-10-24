import { useCallback, useState } from 'react'

export interface SourceFile {
  id: string
  file: File
}

/** An ordered list of input files for tools that do not work on the open PDF. */
export function useSourceFiles(multiple = true) {
  const [files, setFiles] = useState<SourceFile[]>([])
  const add = useCallback(
    (incoming: File[]) => {
      const next = incoming.map((file) => ({ id: crypto.randomUUID(), file }))
      setFiles((current) => (multiple ? [...current, ...next] : next.slice(0, 1)))
    },
    [multiple],
  )
  const remove = useCallback((id: string) => setFiles((current) => current.filter((entry) => entry.id !== id)), [])
  const move = useCallback(
    (id: string, delta: number) =>
      setFiles((current) => {
        const index = current.findIndex((entry) => entry.id === id)
        const target = index + delta
        if (index < 0 || target < 0 || target >= current.length) return current
        const next = [...current]
        const [entry] = next.splice(index, 1)
        next.splice(target, 0, entry)
        return next
      }),
    [],
  )
  const clear = useCallback(() => setFiles([]), [])
  return { files, add, remove, move, clear, setFiles }
}
