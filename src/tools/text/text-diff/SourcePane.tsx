import { useRef, useState } from 'react'
import { FolderOpenIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { IconAction } from '@/shared/components/EditorPane'
import { TextEditor } from '@/shared/components/TextEditor'
import { cn } from '@/shared/utils/cn'

const MAX_FILE_BYTES = 20 * 1024 * 1024

export function SourcePane({
  side,
  value,
  name,
  onChange,
  onLoad,
  onSubmit,
  onError,
}: {
  side: 'left' | 'right'
  value: string
  name: string
  onChange: (value: string) => void
  onLoad: (text: string, name: string) => void
  onSubmit: () => void
  onError: (message: string) => void
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const title = t(side === 'left' ? 'diff.left' : 'diff.right')

  const readFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      onError(t('diff.fileTooLarge', { name: file.name }))
      return
    }
    void file.text().then(
      (text) => onLoad(text, file.name),
      () => onError(t('diff.fileReadFailed', { name: file.name })),
    )
  }

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-col"
      onDragOverCapture={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDropCapture={(event) => {
        const file = event.dataTransfer.files[0]
        setDragging(false)
        if (!file) return
        event.preventDefault()
        event.stopPropagation()
        readFile(file)
      }}
    >
      <TextEditor
        value={value}
        onChange={onChange}
        fill
        ariaLabel={title}
        placeholder={t(side === 'left' ? 'diff.placeholderLeft' : 'diff.placeholderRight')}
        onKeyCommand={onSubmit}
        label={
          <span className="flex min-w-0 items-center gap-1.5">
            {title}
            {name && <span className="truncate font-normal text-muted-foreground">{name}</span>}
          </span>
        }
        actions={
          <IconAction label={t('diff.openFile')} onClick={() => inputRef.current?.click()}>
            <FolderOpenIcon />
          </IconAction>
        }
      />
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) readFile(file)
          event.target.value = ''
        }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 grid place-items-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-sm font-medium text-primary transition-opacity duration-150',
          dragging ? 'opacity-100' : 'opacity-0',
        )}
      >
        {t('diff.dropFile')}
      </div>
    </div>
  )
}
