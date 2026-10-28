import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckIcon, FolderOpenIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  compareBlobs,
  hexWindow,
  type ByteComparison,
} from '@/core/engines/hash/compare'
import {
  compareExpected,
  decodeInput,
  digestBytes,
  entropyFromBytes,
  byteHistogram,
  parseExpected,
  type DigestFormat,
  type InputEncoding,
} from '@/core/engines/hash/digests'
import { toManifest } from '@/core/engines/hash/manifest'
import { formatBytes } from '@/core/engines/image'
import { FileDropZone } from '@/shared/components/files'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'

import { DigestList } from './DigestList'
import { FileResultCard } from './FileResultCard'
import { ByteHistogramChart, CompareDiffBar, CompareRegionMap, EntropyGauge } from './ForensicsViz'
import { DigestPresetBar } from './DigestPresetBar'
import { QueueToolbar } from './QueueToolbar'
import { SessionDashboard, SessionMetricPills } from './SessionDashboard'
import {
  collectSessionAnalytics,
  filterAndSortQueue,
  type QueueFilter,
  type QueueSort,
} from './sessionStats'
import type { HashQueueItem } from './types'
import type { DigestAlgorithm } from '@/core/engines/hash/digests'
import type { DigestPreset } from './useDigestSettings'

const MODES = ['text', 'files', 'compare'] as const
type Mode = (typeof MODES)[number]

const ENCODINGS: { value: InputEncoding; labelKey: string }[] = [
  { value: 'utf8', labelKey: 'hashToolkit.encoding.utf8' },
  { value: 'hex', labelKey: 'hashToolkit.encoding.hex' },
  { value: 'base64', labelKey: 'hashToolkit.encoding.base64' },
]

const FORMATS: { value: DigestFormat; label: string }[] = [
  { value: 'hex', label: 'hex' },
  { value: 'HEX', label: 'HEX' },
  { value: 'base64', label: 'b64' },
]

function CompareSummary({
  result,
  fileA,
  fileB,
}: {
  result: ByteComparison
  fileA: File
  fileB: File
}) {
  const { t } = useTranslation()
  if (result.identical) {
    return (
      <div className="space-y-2">
        <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-800 dark:text-emerald-200">
          {t('hashToolkit.compare.identical')}
        </p>
        <CompareDiffBar identical sizeA={fileA.size} sizeB={fileB.size} differingBytes={0} />
      </div>
    )
  }
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3 text-[12px]">
      <p className="font-medium">{t('hashToolkit.compare.different')}</p>
      <CompareDiffBar
        identical={false}
        sizeA={result.sizeA}
        sizeB={result.sizeB}
        differingBytes={result.differingBytes}
      />
      <ul className="list-inside list-disc text-muted-foreground">
        <li>
          {t('hashToolkit.compare.sizes', {
            a: formatBytes(result.sizeA),
            b: formatBytes(result.sizeB),
          })}
        </li>
        {result.firstDifference != null && (
          <li>{t('hashToolkit.compare.firstAt', { offset: result.firstDifference })}</li>
        )}
        <li>
          {t('hashToolkit.compare.diffBytes', { count: result.differingBytes.toLocaleString() })}
        </li>
        <li>
          {t('hashToolkit.compare.regions', {
            count: result.ranges.length,
            truncated: result.rangesTruncated ? t('hashToolkit.compare.truncated') : '',
          })}
        </li>
      </ul>
    </div>
  )
}

export function ChecksumPanel({
  items,
  onEnqueue,
  onRemove,
  onClear,
  onPinBaseline,
  algorithms,
  digestPreset,
  onDigestPresetChange,
}: {
  items: HashQueueItem[]
  onEnqueue: (files: File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
  onPinBaseline: (item: HashQueueItem) => void
  algorithms: readonly DigestAlgorithm[]
  digestPreset: DigestPreset
  onDigestPresetChange: (preset: DigestPreset) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [mode, setMode] = useState<Mode>('files')
  const [text, setText] = useState('')
  const [encoding, setEncoding] = useState<InputEncoding>('utf8')
  const [format, setFormat] = useState<DigestFormat>('hex')
  const [textDigests, setTextDigests] = useState<Awaited<ReturnType<typeof digestBytes>> | null>(
    null,
  )
  const [textBytes, setTextBytes] = useState(0)
  const [textEntropy, setTextEntropy] = useState(0)
  const [textHistogram, setTextHistogram] = useState<Uint32Array | null>(null)
  const [expectedRaw, setExpectedRaw] = useState('')
  const expected = useMemo(() => parseExpected(expectedRaw), [expectedRaw])
  const textVerdict = useMemo(
    () => (textDigests ? compareExpected(expected, textDigests) : null),
    [expected, textDigests],
  )

  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [compare, setCompare] = useState<ByteComparison | null>(null)
  const [compareBusy, setCompareBusy] = useState(false)
  const [hexRows, setHexRows] = useState<Awaited<ReturnType<typeof hexWindow>>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const [queueQuery, setQueueQuery] = useState('')
  const [queueSort, setQueueSort] = useState<QueueSort>('name')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')

  const sessionAnalytics = useMemo(() => collectSessionAnalytics(items), [items])
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>()
    for (const group of sessionAnalytics.duplicates) {
      for (const id of group.ids) ids.add(id)
    }
    return ids
  }, [sessionAnalytics.duplicates])
  const visibleItems = useMemo(
    () =>
      filterAndSortQueue(items, {
        query: queueQuery,
        sort: queueSort,
        filter: queueFilter,
        duplicateIds,
      }),
    [items, queueQuery, queueSort, queueFilter, duplicateIds],
  )

  const pickFolder = () => folderRef.current?.click()

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    let live = true
    if (!text.trim()) {
      queueMicrotask(() => {
        if (live) {
          setTextDigests(null)
          setTextBytes(0)
          setTextEntropy(0)
          setTextHistogram(null)
        }
      })
      return () => {
        live = false
      }
    }
    const decoded = decodeInput(text, encoding)
    if (!decoded.ok) {
      queueMicrotask(() => {
        if (live) {
          setTextDigests(null)
          setTextBytes(0)
          setTextEntropy(0)
          setTextHistogram(null)
        }
      })
      return () => {
        live = false
      }
    }
    void digestBytes(decoded.bytes, algorithms).then((digests) => {
      if (live) {
        setTextDigests(digests)
        setTextBytes(decoded.bytes.length)
        setTextEntropy(entropyFromBytes(decoded.bytes))
        setTextHistogram(byteHistogram(decoded.bytes))
      }
    })
    return () => {
      live = false
    }
  }, [text, encoding, algorithms])

  const verifyHex = expected?.hex
  const fileVerdict = useMemo(() => {
    if (!expected || items.length === 0) return null
    for (const item of items) {
      if (item.status !== 'done' || !item.result) continue
      const verdict = compareExpected(expected, item.result.digests)
      if (verdict.state === 'match') return verdict
    }
    return items.find((i) => i.status === 'done' && i.result)
      ? compareExpected(expected, items.find((i) => i.status === 'done')!.result!.digests)
      : null
  }, [expected, items])

  const runCompare = () => {
    if (!fileA || !fileB) return
    setCompareBusy(true)
    setCompare(null)
    setHexRows([])
    void compareBlobs(fileA, fileB)
      .then(async (result) => {
        setCompare(result)
        if (!result.identical && result.firstDifference != null) {
          setHexRows(await hexWindow(fileA, fileB, result.firstDifference))
        }
      })
      .finally(() => setCompareBusy(false))
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="status" aria-live="polite" className="sr-only">
        {notice ?? ''}
      </div>
      {notice && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-center text-[11px] text-emerald-800 dark:text-emerald-200">
          {notice}
        </p>
      )}
      <DigestPresetBar value={digestPreset} onChange={onDigestPresetChange} />

      <Segmented
        value={mode}
        onValueChange={(v) => setMode(v as Mode)}
        ariaLabel={t('hashToolkit.mode.label')}
        options={MODES.map((value) => ({
          value,
          label: t(`hashToolkit.mode.${value}`),
        }))}
      />

      <div className="rounded-xl border bg-background/80 p-2 shadow-xs">
        <label className="text-[11px] font-medium text-muted-foreground" htmlFor="hash-verify">
          {t('hashToolkit.verify.label')}
        </label>
        <div className="mt-1 flex gap-1.5">
          <Input
            id="hash-verify"
            value={expectedRaw}
            onChange={(e) => setExpectedRaw(e.target.value)}
            placeholder={t('hashToolkit.verify.placeholder')}
            className="h-8 font-mono text-xs"
            spellCheck={false}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={t('hashToolkit.verify.action')}
            disabled={!expectedRaw.trim()}
          >
            <CheckIcon />
          </Button>
        </div>
        {expectedRaw && fileVerdict?.state === 'invalid' && textVerdict?.state === 'invalid' && (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            {t('hashToolkit.verify.invalid')}
          </p>
        )}
        {fileVerdict?.state === 'match' && (
          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            {t('hashToolkit.verify.fileMatch', { algorithm: fileVerdict.algorithm })}
          </p>
        )}
        {fileVerdict?.state === 'mismatch' && (
          <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
            {t('hashToolkit.verify.mismatch')}
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {mode === 'text' && (
          <motion.div
            key="text"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t('hashToolkit.encoding.label')}
              </span>
              <Segmented
                value={encoding}
                onValueChange={(v) => setEncoding(v as InputEncoding)}
                ariaLabel={t('hashToolkit.encoding.label')}
                size="sm"
                options={ENCODINGS.map((enc) => ({
                  value: enc.value,
                  label: t(enc.labelKey),
                }))}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{t('hashToolkit.output.label')}</span>
                {FORMATS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  size="xs"
                  variant={format === f.value ? 'secondary' : 'outline'}
                  className="font-mono"
                  onClick={() => setFormat(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            </div>
            <TextEditor
              value={text}
              onChange={setText}
              placeholder={t('hashToolkit.textPlaceholder')}
              ariaLabel={t('hashToolkit.textPlaceholder')}
              minRows={4}
            />
            {textDigests && textHistogram && (
              <div className="grid items-start gap-3 rounded-xl border bg-muted/15 p-3 @md:grid-cols-[minmax(0,7rem)_1fr]">
                <div className="text-center @md:text-left">
                  <EntropyGauge entropy={textEntropy} />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {t('hashToolkit.viz.byteCount', { count: textBytes.toLocaleString() })}
                  </p>
                </div>
                <ByteHistogramChart histogram={textHistogram} />
              </div>
            )}
            {textDigests && (
              <DigestList
                digests={textDigests}
                format={format}
                highlight={textVerdict?.state === 'match' ? expected?.hex : undefined}
              />
            )}
          </motion.div>
        )}

        {mode === 'files' && (
          <motion.div
            key="files"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-2"
          >
            {items.length === 0 ? (
              <>
                <FileDropZone
                  title={t('hashToolkit.drop.title')}
                  hint={t('hashToolkit.drop.hint')}
                  multiple
                  onFiles={onEnqueue}
                  glyphs={['PDF', 'IMG', 'ZIP']}
                />
                <div className="flex justify-center">
                  <Button type="button" size="sm" variant="outline" onClick={pickFolder}>
                    <FolderOpenIcon className="size-3.5" />
                    {t('hashToolkit.drop.folder')}
                  </Button>
                  <input
                    ref={folderRef}
                    type="file"
                    className="sr-only"
                    multiple
                    {...({ webkitdirectory: '' } as ComponentProps<'input'>)}
                    aria-label={t('hashToolkit.drop.folder')}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? [])
                      e.target.value = ''
                      if (files.length > 0) onEnqueue(files)
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <SessionDashboard analytics={sessionAnalytics} />
                <SessionMetricPills
                  analytics={sessionAnalytics}
                  algorithmCount={algorithms.length}
                />
                <FileDropZone
                  compact
                  title={t('hashToolkit.drop.add')}
                  multiple
                  onFiles={onEnqueue}
                />
                <QueueToolbar
                  query={queueQuery}
                  onQueryChange={setQueueQuery}
                  sort={queueSort}
                  onSortChange={setQueueSort}
                  filter={queueFilter}
                  onFilterChange={setQueueFilter}
                />
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <p className="text-[11px] text-muted-foreground">
                    {t('hashToolkit.queueCount', { count: visibleItems.length })}
                    {visibleItems.length !== items.length
                      ? ` · ${items.length} total`
                      : null}
                  </p>
                  <Button type="button" size="xs" variant="ghost" onClick={onClear}>
                    <Trash2Icon className="size-3" />
                    {t('hashToolkit.clearAll')}
                  </Button>
                </div>
                {visibleItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-6 text-center text-[11px] text-muted-foreground">
                    {t('hashToolkit.queue.emptyFilter')}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {visibleItems.map((item) => (
                        <li key={item.id}>
                          <FileResultCard
                            item={item}
                            verifyHex={verifyHex}
                            duplicate={duplicateIds.has(item.id)}
                            onRemove={() => onRemove(item.id)}
                            onPinBaseline={() => onPinBaseline(item)}
                          />
                        </li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
                {items.some((i) => i.status === 'done') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="self-start"
                    onClick={async () => {
                      const manifest = toManifest(
                        items
                          .filter((i) => i.status === 'done' && i.result)
                          .map((i) => ({
                            id: i.id,
                            path: i.path,
                            digests: i.result!.digests,
                          })),
                        'SHA-256',
                      )
                      try {
                        await navigator.clipboard.writeText(manifest)
                        setNotice(t('hashToolkit.manifestCopied'))
                      } catch {
                        /* clipboard blocked */
                      }
                    }}
                  >
                    <UploadIcon className="size-3.5" />
                    {t('hashToolkit.copyManifest')}
                  </Button>
                )}
              </>
            )}
          </motion.div>
        )}

        {mode === 'compare' && (
          <motion.div
            key="compare"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="grid gap-2 @md:grid-cols-2"
          >
            {(['A', 'B'] as const).map((slot) => {
              const file = slot === 'A' ? fileA : fileB
              const setFile = slot === 'A' ? setFileA : setFileB
              return (
                <div key={slot} className="rounded-xl border bg-muted/20 p-2">
                  <p className="mb-1 text-[11px] font-medium">
                    {t(`hashToolkit.compare.file${slot}`)}
                  </p>
                  {file ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2 py-1.5 text-[11px]">
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setFile(null)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  ) : (
                    <FileDropZone
                      compact
                      title={t('hashToolkit.compare.pick')}
                      onFiles={(files) => setFile(files[0] ?? null)}
                    />
                  )}
                </div>
              )
            })}
            <div className="col-span-full flex justify-center">
              <Button type="button" disabled={!fileA || !fileB || compareBusy} onClick={runCompare}>
                {compareBusy ? t('hashToolkit.compare.running') : t('hashToolkit.compare.run')}
              </Button>
            </div>
            {compare && fileA && fileB && (
              <div className="col-span-full space-y-2">
                <CompareSummary result={compare} fileA={fileA} fileB={fileB} />
                {!compare.identical && compare.ranges.length > 0 && (
                  <CompareRegionMap
                    size={Math.max(fileA.size, fileB.size)}
                    ranges={compare.ranges}
                  />
                )}
                {hexRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border bg-background p-2 font-mono text-[10px]">
                    {hexRows.map((row) => (
                      <div
                        key={row.offset}
                        className="grid grid-cols-[auto_1fr_1fr] gap-2 border-b border-border/40 py-0.5 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {row.offset.toString(16).padStart(8, '0')}
                        </span>
                        <span>
                          {row.a.map((b, i) => (
                            <span key={i} className={cn(row.a[i] !== row.b[i] && 'text-red-500')}>
                              {b == null ? '  ' : b.toString(16).padStart(2, '0')}{' '}
                            </span>
                          ))}
                        </span>
                        <span>
                          {row.b.map((b, i) => (
                            <span key={i} className={cn(row.a[i] !== row.b[i] && 'text-red-500')}>
                              {b == null ? '  ' : b.toString(16).padStart(2, '0')}{' '}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
