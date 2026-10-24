import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileCheck2Icon,
  LoaderCircleIcon,
  PenLineIcon,
  SignatureIcon,
  SquareCheckIcon,
  TextCursorInputIcon,
  TextIcon,
  Trash2Icon,
  WandSparklesIcon,
} from 'lucide-react'

import { addFormFields, editPdf, readPdfFormFields, type FormFieldInfo, type FormValues, type NewField, type NewFieldType } from '@/core/engines/pdf/edit'
import { readPageText } from '@/core/engines/pdf/pdfjs'
import { PdfPageImage } from '@/shared/components/pdf'
import { ActionBar, OptionField, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { FormFields } from './FormFields'
import { clamp } from './placed'
import { pdfArtifact, sourceOf, stemOf, useOpenPdf, usePdfSession } from './session'
import { useTask } from './useTask'

type Mode = 'fill' | 'create'
type Draft = NewField & { id: string }

const FIELD_TYPES: { type: NewFieldType; icon: ReactNode }[] = [
  { type: 'text', icon: <TextCursorInputIcon /> },
  { type: 'multiline', icon: <TextIcon /> },
  { type: 'checkbox', icon: <SquareCheckIcon /> },
  { type: 'dropdown', icon: <ChevronDownSquareIcon /> },
  { type: 'signature', icon: <SignatureIcon /> },
]

/** Default size in points when a field is placed with a click instead of a drag. */
const DEFAULT_SIZE: Record<NewFieldType, [number, number]> = {
  text: [180, 20],
  multiline: [240, 64],
  checkbox: [14, 14],
  dropdown: [140, 20],
  signature: [180, 36],
}

/** Blank lines (`____`) become text fields and box glyphs become checkboxes. */
async function detectFields(doc: ReturnType<typeof useOpenPdf>, taken: Draft[]): Promise<Draft[]> {
  const found: Draft[] = []
  for (let index = 0; index < doc.pages.length; index += 1) {
    const page = await readPageText(doc.handle, index + 1)
    for (const run of page.runs) {
      const charWidth = run.w / Math.max(1, run.str.length)
      for (const match of run.str.matchAll(/_{4,}/g)) {
        const x = run.x + (match.index ?? 0) * charWidth
        const w = match[0].length * charWidth
        const h = Math.max(14, run.size * 1.25)
        found.push({ id: crypto.randomUUID(), type: 'text', name: `field_${index + 1}_${found.length + 1}`, page: index, u: x / page.width, v: (run.y + run.h - h + run.size * 0.15) / page.height, w: w / page.width, h: h / page.height })
      }
      for (const match of run.str.matchAll(/[☐□▢❏❑⬜]/g)) {
        const x = run.x + (match.index ?? 0) * charWidth
        const size = Math.max(9, run.size)
        found.push({ id: crypto.randomUUID(), type: 'checkbox', name: `check_${index + 1}_${found.length + 1}`, page: index, u: x / page.width, v: run.y / page.height, w: size / page.width, h: size / page.height })
      }
    }
  }
  const overlaps = (a: Draft, b: Draft) => a.page === b.page && a.u < b.u + b.w && b.u < a.u + a.w && a.v < b.v + b.h && b.v < a.v + a.h
  return found.filter((field) => !taken.some((existing) => overlaps(existing, field)))
}

function FieldCanvas({
  doc,
  page,
  fields,
  selectedId,
  onCreate,
  onSelect,
  onMove,
}: {
  doc: ReturnType<typeof useOpenPdf>
  page: number
  fields: Draft[]
  selectedId: string | null
  onCreate: (box: { u: number; v: number; w: number; h: number } | { u: number; v: number }) => void
  onSelect: (id: string | null) => void
  onMove: (id: string, u: number, v: number) => void
}) {
  const { t } = useTranslation()
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: 'create' | 'move'; id?: string; x: number; y: number; u: number; v: number } | null>(null)
  const [draft, setDraft] = useState<{ u: number; v: number; w: number; h: number } | null>(null)
  const info = doc.pages[page]

  const point = (event: PointerEvent) => {
    const box = frame.current!.getBoundingClientRect()
    return { u: clamp((event.clientX - box.left) / box.width, 0, 1), v: clamp((event.clientY - box.top) / box.height, 0, 1) }
  }

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-field-id]')
    const at = point(event)
    if (target) {
      const field = fields.find((entry) => entry.id === target.dataset.fieldId)
      if (!field) return
      onSelect(field.id)
      drag.current = { kind: 'move', id: field.id, x: at.u, y: at.v, u: field.u, v: field.v }
    } else {
      drag.current = { kind: 'create', x: at.u, y: at.v, u: at.u, v: at.v }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    const at = point(event)
    if (current.kind === 'move' && current.id) {
      const field = fields.find((entry) => entry.id === current.id)
      if (field) onMove(current.id, clamp(current.u + at.u - current.x, 0, 1 - field.w), clamp(current.v + at.v - current.y, 0, 1 - field.h))
    } else {
      setDraft({ u: Math.min(current.x, at.u), v: Math.min(current.y, at.v), w: Math.abs(at.u - current.x), h: Math.abs(at.v - current.y) })
    }
  }

  const up = () => {
    const current = drag.current
    drag.current = null
    if (current?.kind === 'create') {
      if (draft && draft.w * info.width > 6 && draft.h * info.height > 6) onCreate(draft)
      else onCreate({ u: current.x, v: current.y })
    }
    setDraft(null)
  }

  return (
    <div
      ref={frame}
      className="relative w-full cursor-crosshair touch-none select-none"
      style={{ maxWidth: Math.max(info.width * 1.3, 320) }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <PdfPageImage doc={doc.handle} pageNumber={page + 1} width={info.width} height={info.height} eager alt={t('fileui.page', { index: page + 1, total: doc.pages.length })} />
      {fields
        .filter((field) => field.page === page)
        .map((field) => (
          <div
            key={field.id}
            data-field-id={field.id}
            role="button"
            tabIndex={0}
            aria-label={t('pdf.forms.fieldLabel', { name: field.name, type: t(`pdf.forms.types.${field.type}`) })}
            aria-pressed={field.id === selectedId}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(field.id)
            }}
            className={cn(
              'absolute flex cursor-move items-center overflow-hidden rounded-[3px] border border-sky-500/80 bg-sky-400/15 px-1 text-[9px] font-medium text-sky-800 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-200',
              field.id === selectedId && 'border-2 border-primary bg-primary/15 shadow-md',
            )}
            style={{ left: `${field.u * 100}%`, top: `${field.v * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` }}
          >
            {field.type !== 'checkbox' && <span className="truncate">{field.name}</span>}
          </div>
        ))}
      {draft && (
        <span
          className="pointer-events-none absolute rounded-[3px] border-2 border-dashed border-primary bg-primary/10"
          style={{ left: `${draft.u * 100}%`, top: `${draft.v * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  )
}

/** Fills a PDF's existing form, or turns any PDF into a fillable one. */
export function FormsPanel() {
  const { t } = useTranslation()
  const doc = useOpenPdf()
  const { showResults } = usePdfSession()
  const [existing, setExisting] = useState<FormFieldInfo[] | null>(null)
  const [mode, setMode] = useState<Mode>('create')
  const [values, setValues] = useState<FormValues>({})
  const [flatten, setFlatten] = useState(false)
  const [fields, setFields] = useState<Draft[]>([])
  const [type, setType] = useState<NewFieldType>('text')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState<number | null>(null)
  const { busy, error, run } = useTask()
  const total = doc.pages.length
  const info = doc.pages[page]
  const selected = fields.find((field) => field.id === selectedId) ?? null

  useEffect(() => {
    let cancelled = false
    readPdfFormFields(sourceOf(doc)).then(
      (found) => {
        if (cancelled) return
        const usable = found.filter((field) => field.type !== 'other')
        setExisting(usable)
        if (usable.length) setMode('fill')
      },
      () => !cancelled && setExisting([]),
    )
    return () => {
      cancelled = true
    }
  }, [doc])

  const update = (id: string, patch: Partial<Draft>) => setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)))

  const create = (box: { u: number; v: number; w?: number; h?: number }) => {
    const [dw, dh] = DEFAULT_SIZE[type]
    const w = box.w ?? dw / info.width
    const h = type === 'checkbox' && box.w ? w * (info.width / info.height) : (box.h ?? dh / info.height)
    const u = box.w ? box.u : clamp(box.u - w / 2, 0, 1 - w)
    const v = box.h ? box.v : clamp(box.v - h / 2, 0, 1 - h)
    const id = crypto.randomUUID()
    const count = fields.filter((field) => field.type === type).length + 1
    setFields((current) => [...current, { id, type, name: `${t(`pdf.forms.types.${type}`)} ${count}`, page, u, v, w, h, options: type === 'dropdown' ? [t('pdf.forms.optionA'), t('pdf.forms.optionB')] : undefined }])
    setSelectedId(id)
  }

  const detect = async () => {
    setDetecting(true)
    try {
      const found = await detectFields(doc, fields)
      setFields((current) => [...current, ...found])
      setDetected(found.length)
    } finally {
      setDetecting(false)
    }
  }

  const save = () =>
    run(async () => {
      const stem = stemOf(doc)
      const source = { name: doc.name, size: doc.bytes.length }
      if (mode === 'fill') {
        const bytes = await editPdf(sourceOf(doc), { items: [], form: { values, flatten } })
        showResults({ artifacts: [pdfArtifact(`${stem}-filled.pdf`, bytes, { source, note: flatten ? t('pdf.forms.flattenedNote') : t('pdf.forms.filledNote') })] })
        return
      }
      const bytes = await addFormFields(
        sourceOf(doc),
        fields.map(({ id: _id, ...field }) => field),
      )
      showResults({ artifacts: [pdfArtifact(`${stem}-fillable.pdf`, bytes, { source, note: t('pdf.forms.createdNote', { count: fields.length }) })] })
    })

  const fieldsOnPage = (index: number) => fields.filter((field) => field.page === index).length
  return (
    <div className="flex flex-col gap-3">
      {existing && existing.length > 0 && (
        <Segmented
          ariaLabel={t('pdf.forms.mode')}
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'fill', label: t('pdf.forms.fill', { count: existing.length }) },
            { value: 'create', label: t('pdf.forms.create') },
          ]}
          className="self-start"
        />
      )}

      {mode === 'fill' && existing ? (
        <PanelSection title={t('pdf.forms.fillTitle')} icon={<PenLineIcon />}>
          <FormFields fields={existing} values={values} onChange={setValues} />
          <OptionSwitch label={t('pdf.sign.flatten')} hint={t('pdf.sign.flattenHint')} checked={flatten} onChange={setFlatten} />
        </PanelSection>
      ) : (
        <div className="grid items-start gap-3 @[860px]:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card/70 p-1" role="toolbar" aria-label={t('pdf.forms.types.label')}>
              {FIELD_TYPES.map((entry) => (
                <Button
                  key={entry.type}
                  variant={type === entry.type ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={type === entry.type}
                  onClick={() => setType(entry.type)}
                  className={cn('[&_svg]:size-3.5', type === entry.type && 'bg-primary/10 text-primary hover:bg-primary/15')}
                >
                  {entry.icon}
                  {t(`pdf.forms.types.${entry.type}`)}
                </Button>
              ))}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void detect()} disabled={detecting}>
                {detecting ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <WandSparklesIcon aria-hidden />}
                {t('pdf.forms.detect')}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
              {detected !== null ? t('pdf.forms.detected', { count: detected }) : t('pdf.forms.hint')}
            </p>
            <div
              className="flex justify-center overflow-hidden rounded-2xl border bg-muted/40 p-4"
              style={{ backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
            >
              <FieldCanvas doc={doc} page={page} fields={fields} selectedId={selectedId} onCreate={create} onSelect={setSelectedId} onMove={(id, u, v) => update(id, { u, v })} />
            </div>
            {total > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0} aria-label={t('pdf.view.previousPage')}>
                  <ChevronLeftIcon />
                </Button>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {t('fileui.page', { index: page + 1, total })}
                  {fieldsOnPage(page) > 0 && ` · ${t('pdf.forms.onPage', { count: fieldsOnPage(page) })}`}
                </span>
                <Button variant="outline" size="icon-sm" onClick={() => setPage((value) => Math.min(total - 1, value + 1))} disabled={page >= total - 1} aria-label={t('pdf.view.nextPage')}>
                  <ChevronRightIcon />
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 @[860px]:sticky @[860px]:top-2">
            <PanelSection title={selected ? t('pdf.forms.fieldTitle') : t('pdf.forms.listTitle', { count: fields.length })} icon={<TextCursorInputIcon />}>
              {selected ? (
                <div className="flex flex-col gap-2.5">
                  <OptionField label={t('pdf.forms.name')}>
                    <Input value={selected.name} onChange={(event) => update(selected.id, { name: event.target.value })} className="h-8" />
                  </OptionField>
                  {selected.type === 'dropdown' && (
                    <OptionField label={t('pdf.forms.options')}>
                      <Input value={(selected.options ?? []).join(', ')} onChange={(event) => update(selected.id, { options: event.target.value.split(',') })} className="h-8" placeholder={t('pdf.forms.optionsPlaceholder')} />
                    </OptionField>
                  )}
                  <OptionSwitch label={t('pdf.forms.required')} checked={!!selected.required} onChange={(required) => update(selected.id, { required })} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedId(null)}>
                      {t('pdf.forms.done')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setFields((current) => current.filter((field) => field.id !== selected.id))
                        setSelectedId(null)
                      }}
                    >
                      <Trash2Icon aria-hidden />
                      {t('pdf.forms.delete')}
                    </Button>
                  </div>
                </div>
              ) : fields.length ? (
                <ul className="flex max-h-80 flex-col gap-1 overflow-auto">
                  {fields.map((field) => (
                    <li key={field.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPage(field.page)
                          setSelectedId(field.id)
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="text-muted-foreground [&_svg]:size-3.5" aria-hidden>
                          {FIELD_TYPES.find((entry) => entry.type === field.type)?.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{field.name}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{t('pdf.forms.pageShort', { page: field.page + 1 })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t('pdf.forms.empty')}</p>
              )}
            </PanelSection>
          </div>
        </div>
      )}

      {error && <PanelError message={error} />}
      <ActionBar>
        <Button onClick={() => void save()} disabled={busy || (mode === 'create' && !fields.length)} className="min-w-40 flex-1 @[480px]:flex-none">
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <FileCheck2Icon aria-hidden />}
          {mode === 'fill' ? t('pdf.forms.saveFilled') : t('pdf.forms.saveFields', { count: fields.length })}
        </Button>
      </ActionBar>
    </div>
  )
}
