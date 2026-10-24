import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BoldIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyPlusIcon,
  FileCheck2Icon,
  HighlighterIcon,
  ImagePlusIcon,
  LoaderCircleIcon,
  MousePointer2Icon,
  PlusIcon,
  SignatureIcon,
  SquareIcon,
  TextCursorInputIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
} from 'lucide-react'

import { editPdf, readPdfFormFields, type FontKey, type FormFieldInfo, type FormValues } from '@/core/engines/pdf/edit'
import { ActionBar, OptionField, OptionSelect, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { PdfPageImage } from '@/shared/components/pdf'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'
import { Swatches } from './common'
import { EditorPage } from './EditorPage'
import { clamp, toEditItems, type PendingImage, type Placed, type PlaceTool } from './placed'
import { bytesToObjectUrl, toEmbeddableImage } from './raster'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { SignatureDialog } from './SignatureDialog'
import { dataUrlToBytes, loadSignatures, storeSignatures, type SavedSignature } from './signatures'
import { useTask } from './useTask'

const TOOLS: { value: PlaceTool; icon: ReactNode }[] = [
  { value: 'select', icon: <MousePointer2Icon /> },
  { value: 'signature', icon: <SignatureIcon /> },
  { value: 'text', icon: <TypeIcon /> },
  { value: 'date', icon: <CalendarDaysIcon /> },
  { value: 'check', icon: <CheckIcon /> },
  { value: 'highlight', icon: <HighlighterIcon /> },
  { value: 'cover', icon: <SquareIcon /> },
  { value: 'image', icon: <ImagePlusIcon /> },
]

const TEXT_COLORS = ['#111827', '#1d4ed8', '#b91c1c', '#047857'] as const
const HIGHLIGHTS = ['#facc15', '#4ade80', '#60a5fa', '#f472b6'] as const
const COVERS = ['#ffffff', '#000000'] as const
const FONT_SIZES = ['8', '10', '12', '14', '16', '20', '24', '32'] as const

function FormFields({ fields, values, onChange }: { fields: FormFieldInfo[]; values: FormValues; onChange: (values: FormValues) => void }) {
  const { t } = useTranslation()
  const set = (name: string, value: string | boolean) => onChange({ ...values, [name]: value })
  return (
    <div className="grid gap-2.5 @[560px]:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.name] ?? field.value
        const label = field.name.replace(/[._]/g, ' ')
        if (field.type === 'checkbox') {
          return <OptionSwitch key={field.name} label={label} checked={value === true} onChange={(next) => set(field.name, next)} disabled={field.readOnly} />
        }
        if ((field.type === 'dropdown' || field.type === 'radio' || field.type === 'list') && field.options.length) {
          return (
            <OptionField key={field.name} label={label}>
              <Select value={typeof value === 'string' && value ? value : undefined} onValueChange={(next) => set(field.name, next)} disabled={field.readOnly}>
                <SelectTrigger className="w-full" aria-label={label}>
                  <SelectValue placeholder={t('pdf.sign.choose')} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>
          )
        }
        if (field.type === 'text') {
          return (
            <OptionField key={field.name} label={label} className={field.multiline ? '@[560px]:col-span-2' : undefined}>
              {field.multiline ? (
                <Textarea value={String(value)} onChange={(event) => set(field.name, event.target.value)} disabled={field.readOnly} rows={3} aria-label={label} />
              ) : (
                <Input value={String(value)} onChange={(event) => set(field.name, event.target.value)} disabled={field.readOnly} className="h-8" aria-label={label} />
              )}
            </OptionField>
          )
        }
        return null
      })}
    </div>
  )
}

export function SignPanel() {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const total = doc.pages.length
  const [page, setPage] = useState(0)
  const [tool, setTool] = useState<PlaceTool>('select')
  const [items, setItems] = useState<Placed[]>([])
  const [history, setHistory] = useState<Placed[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signatures, setSignatures] = useState<SavedSignature[]>(() => loadSignatures())
  const [pending, setPending] = useState<PendingImage | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fields, setFields] = useState<FormFieldInfo[]>([])
  const [formValues, setFormValues] = useState<FormValues>({})
  const [flatten, setFlatten] = useState(false)
  const { busy, error, run } = useTask()
  const imageInput = useRef<HTMLInputElement>(null)
  const urls = useRef(new Set<string>())
  const textArea = useRef<HTMLTextAreaElement>(null)
  const [focusText, setFocusText] = useState<string | null>(null)

  useEffect(() => {
    const owned = urls.current
    return () => {
      for (const url of owned) URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    readPdfFormFields(sourceOf(doc)).then(
      (found) => !cancelled && setFields(found.filter((field) => field.type !== 'other')),
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [doc])

  useEffect(() => {
    if (focusText && textArea.current) {
      textArea.current.focus()
      textArea.current.select()
      setFocusText(null)
    }
  }, [focusText])

  const info = doc.pages[page]
  const selected = items.find((item) => item.id === selectedId) ?? null
  const formChanged = Object.keys(formValues).length > 0 || flatten
  const pagesWithItems = new Set(items.map((item) => item.page))

  const checkpoint = () => setHistory((current) => [...current.slice(-49), items])
  const undo = () => {
    const previous = history.at(-1)
    if (!previous) return
    setHistory((current) => current.slice(0, -1))
    setItems(previous)
    if (selectedId && !previous.some((item) => item.id === selectedId)) setSelectedId(null)
  }

  const add = (item: Placed) => {
    checkpoint()
    setItems((current) => [...current, item])
    setSelectedId(item.id)
  }

  const update = (id: string, patch: Partial<Placed>) =>
    setItems((current) => current.map((item) => (item.id === id ? ({ ...item, ...patch } as Placed) : item)))

  const remove = (id: string) => {
    checkpoint()
    setItems((current) => current.filter((item) => item.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const copyToAllPages = (item: Placed) => {
    checkpoint()
    const copies = doc.pages.flatMap((_, index) => (index === item.page ? [] : [{ ...item, id: crypto.randomUUID(), page: index }]))
    setItems((current) => [...current, ...copies])
  }

  const ownUrl = (url: string) => {
    urls.current.add(url)
    return url
  }

  const placeImage = (image: PendingImage, u: number, v: number) => {
    const width = image.signature ? 0.28 : 0.3
    const height = width * (image.height / image.width) * (info.width / info.height)
    const w = Math.min(width, 0.9)
    const h = Math.min(height, 0.9)
    add({
      id: crypto.randomUUID(),
      kind: 'image',
      page,
      u: clamp(u - w / 2, 0, 1 - w),
      v: clamp(v - h / 2, 0, 1 - h),
      w,
      h,
      url: image.url,
      bytes: image.bytes,
      format: image.format,
      signature: image.signature,
    })
  }

  const place = (u: number, v: number) => {
    const id = crypto.randomUUID()
    const pointW = (points: number) => points / info.width
    const pointH = (points: number) => points / info.height
    switch (tool) {
      case 'signature':
      case 'image':
        if (pending) placeImage(pending, u, v)
        else if (tool === 'signature') setDialogOpen(true)
        else imageInput.current?.click()
        if (pending) setTool('select')
        return
      case 'text':
      case 'date': {
        const fontSize = tool === 'date' ? 12 : 14
        const text = tool === 'date' ? new Date().toLocaleDateString(i18n.language) : ''
        add({ id, kind: 'text', page, u: clamp(u - 0.004, 0, 0.98), v: clamp(v - pointH(fontSize * 0.6), 0, 0.98), text, fontSize, font: 'helvetica', bold: false, color: TEXT_COLORS[0] })
        setFocusText(id)
        setTool('select')
        return
      }
      case 'check': {
        const w = pointW(16)
        const h = pointH(16)
        add({ id, kind: 'check', page, u: clamp(u - w / 2, 0, 1 - w), v: clamp(v - h / 2, 0, 1 - h), w, h, color: TEXT_COLORS[0] })
        return
      }
      case 'highlight':
      case 'cover': {
        const w = 0.3
        const h = tool === 'highlight' ? pointH(16) : 0.05
        add({
          id,
          kind: 'rect',
          page,
          u: clamp(u - w / 2, 0, 1 - w),
          v: clamp(v - h / 2, 0, 1 - h),
          w,
          h,
          variant: tool,
          color: tool === 'highlight' ? HIGHLIGHTS[0] : COVERS[0],
          opacity: tool === 'highlight' ? 0.4 : 1,
        })
        setTool('select')
        return
      }
    }
  }

  const chooseTool = (next: PlaceTool) => {
    setTool(next)
    if (next === 'signature' && !signatures.length) setDialogOpen(true)
    if (next === 'signature' && signatures.length && (!pending || !pending.signature)) pickSignature(signatures[0])
    if (next === 'image') imageInput.current?.click()
    if (next !== 'signature' && next !== 'image') setPending(null)
  }

  function pickSignature(signature: SavedSignature) {
    const bytes = dataUrlToBytes(signature.dataUrl)
    setPending({ url: signature.dataUrl, bytes, format: 'png', width: signature.width, height: signature.height, signature: true })
    setTool('signature')
  }

  const createSignature = (signature: SavedSignature, remember: boolean) => {
    setDialogOpen(false)
    if (remember) setSignatures(storeSignatures([signature, ...signatures]))
    pickSignature(signature)
  }

  const deleteSignature = (id: string) => {
    setSignatures(storeSignatures(signatures.filter((signature) => signature.id !== id)))
    if (pending?.signature && signatures.find((signature) => signature.id === id)?.dataUrl === pending.url) setPending(null)
  }

  const loadImage = async (file: File) => {
    try {
      const image = await toEmbeddableImage(file, 2400)
      setPending({ ...image, url: ownUrl(bytesToObjectUrl(image.bytes, image.format === 'png' ? 'image/png' : 'image/jpeg')), signature: false })
      setTool('image')
    } catch {
      setTool('select')
    }
  }

  const save = () =>
    run(async () => {
      const editItems = await toEditItems(items)
      const bytes = await editPdf(sourceOf(doc), {
        items: editItems,
        form: fields.length ? { values: formValues, flatten } : undefined,
      })
      showResults({
        artifacts: [
          pdfArtifact(`${stemOf(doc)}-signed.pdf`, bytes, {
            source: { name: doc.name, size: doc.bytes.length },
            note: items.some((item) => item.kind === 'rect' && item.variant === 'cover') ? t('pdf.sign.coverNote') : t('pdf.sign.note'),
          }),
        ],
      })
    })

  const hint = tool === 'select' ? (items.length ? t('pdf.sign.hintSelect') : t('pdf.sign.hintStart')) : pending || (tool !== 'signature' && tool !== 'image') ? t(`pdf.sign.hint.${tool}`) : t('pdf.sign.hintPending')

  const properties = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={selected ? `${selected.kind}-${selected.id}` : tool === 'signature' ? 'signatures' : 'none'}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        transition={{ duration: 0.18 }}
        className="flex flex-col gap-3"
      >
        {selected ? (
          <>
            <p className="text-xs font-semibold">
              {t(`pdf.sign.itemLabel.${selected.kind === 'image' && selected.signature ? 'signature' : selected.kind === 'rect' ? selected.variant : selected.kind}`)}
              <span className="ml-1.5 font-normal text-muted-foreground">{t('pdf.view.pageShort', { page: selected.page + 1 })}</span>
            </p>
            {selected.kind === 'text' && (
              <>
                <OptionField label={t('pdf.sign.textLabel')}>
                  <Textarea
                    ref={textArea}
                    value={selected.text}
                    rows={3}
                    onFocus={checkpoint}
                    onChange={(event) => update(selected.id, { text: event.target.value })}
                    placeholder={t('pdf.sign.emptyText')}
                    className="text-sm"
                  />
                </OptionField>
                <div className="grid grid-cols-2 gap-2">
                  <OptionSelect
                    label={t('pdf.sign.font')}
                    value={selected.font}
                    onChange={(font: FontKey) => update(selected.id, { font })}
                    options={[
                      { value: 'helvetica', label: 'Helvetica' },
                      { value: 'times', label: 'Times' },
                      { value: 'courier', label: 'Courier' },
                    ]}
                  />
                  <OptionSelect
                    label={t('pdf.sign.size')}
                    value={(FONT_SIZES.find((size) => Number(size) === selected.fontSize) ?? '14') as (typeof FONT_SIZES)[number]}
                    onChange={(size) => update(selected.id, { fontSize: Number(size) })}
                    options={FONT_SIZES.map((size) => ({ value: size, label: `${size} pt` }))}
                  />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <Swatches label={t('pdf.sign.color')} colors={TEXT_COLORS} value={selected.color} onChange={(color) => update(selected.id, { color })} />
                  <Button
                    variant={selected.bold ? 'secondary' : 'outline'}
                    size="icon-sm"
                    aria-pressed={selected.bold}
                    aria-label={t('pdf.sign.bold')}
                    onClick={() => update(selected.id, { bold: !selected.bold })}
                  >
                    <BoldIcon />
                  </Button>
                </div>
              </>
            )}
            {selected.kind === 'rect' && (
              <>
                <Swatches
                  label={t('pdf.sign.color')}
                  colors={selected.variant === 'cover' ? COVERS : HIGHLIGHTS}
                  value={selected.color}
                  onChange={(color) => update(selected.id, { color })}
                />
                {selected.variant === 'highlight' && (
                  <OptionField label={t('pdf.sign.opacity', { value: Math.round(selected.opacity * 100) })}>
                    <Slider
                      value={[selected.opacity * 100]}
                      min={15}
                      max={80}
                      step={5}
                      thumbLabel={t('pdf.sign.opacityLabel')}
                      onValueChange={([value]) => update(selected.id, { opacity: value / 100 })}
                    />
                  </OptionField>
                )}
                {selected.variant === 'cover' && <p className="text-[11px] text-muted-foreground">{t('pdf.sign.coverHint')}</p>}
              </>
            )}
            {selected.kind === 'check' && <Swatches label={t('pdf.sign.color')} colors={TEXT_COLORS} value={selected.color} onChange={(color) => update(selected.id, { color })} />}
            {selected.kind !== 'text' && (
              <OptionField label={t('pdf.sign.width', { value: Math.round(selected.w * 100) })}>
                <Slider
                  value={[selected.w * 100]}
                  min={2}
                  max={Math.max(2, Math.round((1 - selected.u) * 100))}
                  step={1}
                  thumbLabel={t('pdf.sign.widthLabel')}
                  onValueChange={([value]) => {
                    const w = value / 100
                    const keep = selected.kind === 'image' || selected.kind === 'check'
                    update(selected.id, keep ? { w, h: Math.min(1 - selected.v, w * (selected.h / selected.w)) } : { w })
                  }}
                />
              </OptionField>
            )}
            <div className="flex flex-wrap gap-1.5">
              {total > 1 && (
                <Button variant="outline" size="xs" onClick={() => copyToAllPages(selected)}>
                  <CopyPlusIcon aria-hidden />
                  {t('pdf.sign.copyAll')}
                </Button>
              )}
              <Button variant="outline" size="xs" onClick={() => remove(selected.id)} className="text-destructive hover:text-destructive">
                <Trash2Icon aria-hidden />
                {t('pdf.sign.delete')}
              </Button>
            </div>
          </>
        ) : tool === 'signature' || signatures.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold">{t('pdf.sign.yourSignatures')}</p>
            <div className="grid grid-cols-2 gap-2">
              {signatures.map((signature) => {
                const active = pending?.signature && pending.url === signature.dataUrl
                return (
                  <div key={signature.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => pickSignature(signature)}
                      aria-pressed={!!active}
                      aria-label={t('pdf.sign.useSaved')}
                      className={cn(
                        'flex h-14 w-full cursor-pointer items-center justify-center rounded-lg border bg-white p-1.5 outline-none transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'border-primary ring-2 ring-primary/25' : 'hover:border-foreground/25',
                      )}
                    >
                      <img src={signature.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSignature(signature.id)}
                      aria-label={t('pdf.sign.forget')}
                      className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm outline-none transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="flex h-14 cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground outline-none transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <PlusIcon className="size-3.5" aria-hidden />
                {t('pdf.sign.newSignature')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('pdf.sign.nothingSelected')}</p>
        )}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 rounded-2xl border bg-card/80 p-1.5 shadow-xs" role="toolbar" aria-label={t('pdf.sign.tools')}>
        {TOOLS.map(({ value, icon }) => {
          const active = tool === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => chooseTool(value)}
              aria-pressed={active}
              className={cn(
                'relative flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4',
                active && 'text-primary hover:bg-transparent hover:text-primary',
              )}
            >
              {active && (
                <motion.span
                  layoutId="pdf-sign-tool"
                  className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/40"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 34 }}
                  aria-hidden
                />
              )}
              <span className="relative" aria-hidden>
                {icon}
              </span>
              <span className="relative hidden @[640px]:inline">{t(`pdf.sign.tool.${value}`)}</span>
              <span className="sr-only @[640px]:hidden">{t(`pdf.sign.tool.${value}`)}</span>
            </button>
          )
        })}
        <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />
        <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!history.length} aria-label={t('pdf.sign.undo')}>
          <Undo2Icon />
        </Button>
        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void loadImage(file)
            else setTool('select')
          }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={hint}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground"
          role="status"
        >
          <TextCursorInputIcon className="size-3.5 shrink-0" aria-hidden />
          {hint}
          {pending && tool !== 'select' && (
            <img src={pending.url} alt="" className="ml-1 h-5 max-w-16 rounded border bg-white object-contain p-px" />
          )}
        </motion.p>
      </AnimatePresence>

      <div className="grid gap-3 @[860px]:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-2">
          <div
            className="flex justify-center overflow-hidden rounded-2xl border bg-muted/40 p-3 @[480px]:p-5"
            style={{
              backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          >
            <EditorPage
              key={page}
              handle={doc.handle}
              index={page}
              info={info}
              items={items.filter((item) => item.page === page)}
              selectedId={selectedId}
              tool={tool}
              onPlace={place}
              onSelect={setSelectedId}
              onChange={update}
              onRemove={remove}
              onCommit={checkpoint}
            />
          </div>
          {total > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={t('pdf.view.previousPage')}>
                <ChevronLeftIcon />
              </Button>
              <ol className="scrollbar-styled flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1" aria-label={t('pdf.view.thumbnails')}>
                {doc.pages.map((pageInfo, index) => (
                  <li key={index} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setPage(index)}
                      aria-current={index === page ? 'page' : undefined}
                      aria-label={t('fileui.page', { index: index + 1, total })}
                      className={cn(
                        'relative block w-12 cursor-pointer rounded-md p-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                        index === page && 'bg-primary/[0.08] ring-[1.5px] ring-primary/60',
                      )}
                    >
                      <PdfPageImage doc={doc.handle} pageNumber={index + 1} width={pageInfo.width} height={pageInfo.height} alt="" />
                      {pagesWithItems.has(index) && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground ring-2 ring-card">
                          {items.filter((item) => item.page === index).length}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
              <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                {page + 1} / {total}
              </span>
              <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.min(total - 1, value + 1))} disabled={page >= total - 1} aria-label={t('pdf.view.nextPage')}>
                <ChevronRightIcon />
              </Button>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-2xl border bg-card/70 p-3 shadow-xs @[860px]:sticky @[860px]:top-2">{properties}</aside>
      </div>

      {fields.length > 0 && (
        <PanelSection title={t('pdf.sign.formTitle', { count: fields.length })} icon={<FileCheck2Icon />}>
          <FormFields fields={fields} values={formValues} onChange={setFormValues} />
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-2.5 py-1.5">
            <label htmlFor="pdf-flatten" className="flex min-w-0 flex-col">
              <span className="text-xs font-medium">{t('pdf.sign.flatten')}</span>
              <span className="text-[11px] text-muted-foreground">{t('pdf.sign.flattenHint')}</span>
            </label>
            <Switch id="pdf-flatten" checked={flatten} onCheckedChange={setFlatten} />
          </div>
        </PanelSection>
      )}

      {error && <PanelError message={error} />}

      <ActionBar>
        <Button onClick={() => void save()} disabled={busy || (!items.length && !formChanged)} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileCheck2Icon aria-hidden />}
          {t('pdf.sign.save')}
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums" role="status" aria-live="polite">
          {items.length ? t('pdf.sign.summary', { count: items.length, pages: pagesWithItems.size }) : t('pdf.sign.summaryEmpty')}
        </span>
      </ActionBar>

      <SignatureDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open && !pending) setTool('select')
        }}
        onCreate={createSignature}
      />
    </div>
  )
}
