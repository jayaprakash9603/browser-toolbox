import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileDownIcon, ImagesIcon, XIcon } from 'lucide-react'

import { downloadDataUrl } from '@/core/engines/capture'
import { fileToDataUrl, formatBytes, loadImageFromDataUrl } from '@/core/engines/image'
import { Button } from '@/shared/components/ui/button'
import { JsonErrorView } from '@/tools/developer/_shared'
import { FileDropzone } from './FileDropzone'

interface PdfImage {
  id: string
  name: string
  size: number
  url: string
}

function pdfImageSource(img: HTMLImageElement, url: string): { data: string; format: 'PNG' | 'JPEG' } {
  if (url.startsWith('data:image/jpeg')) return { data: url, format: 'JPEG' }
  if (url.startsWith('data:image/png')) return { data: url, format: 'PNG' }
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext('2d')?.drawImage(img, 0, 0)
  return { data: canvas.toDataURL('image/png'), format: 'PNG' }
}

export function ImagesToPdfView() {
  const { t } = useTranslation()
  const [images, setImages] = useState<PdfImage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addImages = async (files: File[]) => {
    const accepted = files.filter((file) => file.type.startsWith('image/'))
    const rejected = files.find((file) => !file.type.startsWith('image/'))
    setError(rejected ? t('files.unsupported', { name: rejected.name }) : null)
    const added = await Promise.all(
      accepted.map(async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        url: await fileToDataUrl(file),
      })),
    )
    setImages((prev) => [...prev, ...added])
  }

  const buildPdf = async () => {
    if (images.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const { jsPDF } = await import('jspdf')
      let doc: InstanceType<typeof jsPDF> | null = null
      for (const image of images) {
        const img = await loadImageFromDataUrl(image.url)
        const orientation = img.naturalWidth > img.naturalHeight ? 'l' : 'p'
        if (doc) doc.addPage('a4', orientation)
        else doc = new jsPDF({ orientation, format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const ratio = Math.min((pageWidth - 20) / img.naturalWidth, (pageHeight - 20) / img.naturalHeight)
        const width = img.naturalWidth * ratio
        const height = img.naturalHeight * ratio
        const { data, format } = pdfImageSource(img, image.url)
        doc.addImage(data, format, (pageWidth - width) / 2, (pageHeight - height) / 2, width, height)
      }
      if (doc) downloadDataUrl(doc.output('datauristring'), `images-${Date.now()}.pdf`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not build the PDF.')
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <FileDropzone
        accept="image/*"
        acceptLabel="PNG, JPG, WEBP, GIF, SVG"
        icon={ImagesIcon}
        title={t('files.drop.images')}
        multiple
        onFiles={(files) => void addImages(files)}
      />
      {error && <JsonErrorView message={error} />}
      {images.length > 0 && (
        <>
          <ol className="grid grid-cols-2 gap-2 @[360px]:grid-cols-3 @[520px]:grid-cols-4">
            {images.map((image, index) => (
              <li key={image.id} className="group relative overflow-hidden rounded-[var(--radius-lg)] border bg-card shadow-xs">
                <img
                  src={image.url}
                  alt={image.name}
                  className="aspect-[4/3] w-full bg-muted/40 object-contain"
                />
                <span className="absolute top-1.5 left-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shadow-xs">
                  {t('files.page', { index: index + 1 })}
                </span>
                <Button
                  variant="secondary"
                  size="icon-xs"
                  className="absolute top-1 right-1 opacity-100 shadow-xs sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  onClick={() => setImages((prev) => prev.filter((item) => item.id !== image.id))}
                  aria-label={t('files.removeImage', { index: index + 1 })}
                >
                  <XIcon />
                </Button>
                <div className="border-t px-2 py-1.5">
                  <p className="truncate text-xs font-medium" title={image.name}>
                    {image.name}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">{formatBytes(image.size)}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void buildPdf()} disabled={busy}>
              <FileDownIcon aria-hidden />
              {busy ? t('files.building') : t('files.buildPdf', { count: images.length })}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setImages([])} disabled={busy}>
              {t('common.clear')}
            </Button>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {t('files.pages', { count: images.length })}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
