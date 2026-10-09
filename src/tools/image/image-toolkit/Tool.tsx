import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadIcon } from 'lucide-react'

import {
  convertImage,
  fileToDataUrl,
  formatBytes,
  getImageInfo,
  loadImageFromDataUrl,
  resizeImage,
  cropImage,
  imageToBase64,
  type ImageFormat,
  type ImageInfo,
} from '@/core/engines/image'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { CopyButton } from '@/shared/components/CopyButton'
import { downloadDataUrl } from '@/core/engines/capture'
import { useImageTool } from '../_shared'

export default function ImageToolkitTool() {
  const { t } = useTranslation()
  const tool = useImageTool('image.image-toolkit')
  const [tab, setTab] = useState<'resize' | 'crop' | 'convert' | 'base64' | 'info'>('resize')
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [info, setInfo] = useState<ImageInfo | null>(null)
  const [widthText, setWidthText] = useState('')
  const [heightText, setHeightText] = useState('')
  const width = parseNumberInRange(widthText, 1)
  const height = parseNumberInRange(heightText, 1)
  const [format, setFormat] = useState<ImageFormat>('image/png')
  const [output, setOutput] = useState('')

  const onFile = (f: File | null) => {
    if (!f) return
    setFile(f)
    void getImageInfo(f).then((r) => {
      if (r.ok) {
        setInfo(r.value)
        setWidthText(String(r.value.width))
        setHeightText(String(r.value.height))
      }
    })
    void fileToDataUrl(f).then(loadImageFromDataUrl).then(setImg)
    setOutput('')
  }

  useEffect(() => {
    let live = true
    Promise.resolve().then(() => {
      if (live) setOutput('')
    })
    return () => {
      live = false
    }
  }, [tab])

  const run = async () => {
    if (!img || !file) return
    if ((tab === 'resize' || tab === 'crop') && (width === null || height === null)) return
    if (tab === 'resize') setOutput(await resizeImage(img, width ?? 1, height ?? 1))
    if (tab === 'crop') setOutput(await cropImage(img, 0, 0, width ?? 1, height ?? 1))
    if (tab === 'convert') setOutput(await convertImage(img, format))
    if (tab === 'base64') {
      const r = await imageToBase64(file)
      if (r.ok) setOutput(r.value)
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-xs text-muted-foreground hover:bg-accent/40">
          <UploadIcon className="size-4" />
          {file ? file.name : t('image.upload')}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            aria-label={t('image.upload')}
          />
        </label>
        {info && (
          <p className="text-[11px] text-muted-foreground">
            {info.width}×{info.height} · {info.format} · {formatBytes(info.sizeBytes)}
          </p>
        )}
        {img && (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="resize">{t('image.resize')}</TabsTrigger>
                <TabsTrigger value="crop">{t('image.crop')}</TabsTrigger>
                <TabsTrigger value="convert">{t('image.convert')}</TabsTrigger>
                <TabsTrigger value="base64">Base64</TabsTrigger>
                <TabsTrigger value="info">{t('image.info')}</TabsTrigger>
              </TabsList>
            </Tabs>
            {(tab === 'resize' || tab === 'crop') && (
              <div className="flex items-center gap-2">
                <NumberField
                  value={widthText}
                  onChange={setWidthText}
                  min={1}
                  className="w-24"
                  ariaLabel="width"
                />
                <span className="text-xs text-muted-foreground">×</span>
                <NumberField
                  value={heightText}
                  onChange={setHeightText}
                  min={1}
                  className="w-24"
                  ariaLabel="height"
                />
              </div>
            )}
            {tab === 'convert' && (
              <div className="flex gap-1.5">
                {(['image/png', 'image/jpeg', 'image/webp'] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={format === f ? 'secondary' : 'outline'}
                    onClick={() => setFormat(f)}
                  >
                    {f.split('/')[1].toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
            {tab !== 'info' && (
              <Button
                size="sm"
                className="w-fit"
                onClick={() => void run()}
                disabled={(tab === 'resize' || tab === 'crop') && (width === null || height === null)}
              >
                {t('text.generate')}
              </Button>
            )}
            <TabsContent value="info" className="mt-0">
              {info && (
                <div className="space-y-1 text-[11px]">
                  {[
                    ['Width', String(info.width)],
                    ['Height', String(info.height)],
                    ['Format', info.format],
                    ['Size', formatBytes(info.sizeBytes)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between rounded border bg-muted/40 px-2 py-1"
                    >
                      <span className="text-muted-foreground">{k}</span>
                      <code className="font-mono">{v}</code>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            {output && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium">{t('text.output')}</span>
                  <div className="flex gap-1">
                    {output.startsWith('data:image') && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => downloadDataUrl(output, `image-${Date.now()}.png`)}
                      >
                        {t('capture.download')}
                      </Button>
                    )}
                    <CopyButton text={output} size="xs" />
                  </div>
                </div>
                {output.startsWith('data:image') ? (
                  <img src={output} alt={t('text.output')} className="max-h-64 rounded-md border" />
                ) : (
                  <pre className="max-h-40 scrollbar-both rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                    {output.slice(0, 2000)}
                    {output.length > 2000 ? '…' : ''}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ToolPage>
  )
}
