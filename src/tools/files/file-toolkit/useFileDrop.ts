import { useRef, useState, type DragEvent } from 'react'

export function useFileDrop(onFiles: (files: File[]) => void) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

  return {
    active,
    handlers: {
      onDragEnter: (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        depth.current += 1
        setActive(true)
      },
      onDragOver: (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setActive(false)
      },
      onDrop: (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        depth.current = 0
        setActive(false)
        const files = Array.from(event.dataTransfer.files)
        if (files.length > 0) onFiles(files)
      },
    },
  }
}
