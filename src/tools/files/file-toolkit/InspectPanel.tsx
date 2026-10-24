import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import {
  BinaryIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  FingerprintIcon,
  GaugeIcon,
  LoaderCircleIcon,
  ScanSearchIcon,
  TextIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'

import {
  HASH_ALGORITHMS,
  base64ToBytes,
  byteProfile,
  bytesToBase64,
  convertLineEndings,
  detectSignature,
  extensionMatches,
  hashBytes,
  hexRows,
  matchHash,
  textProfile,
  type HashAlgorithm,
} from '@/core/engines/files/inspect'
import { extensionOf } from '@/core/engines/files/kinds'
import { formatBytes } from '@/core/engines/image'
import { CopyButton } from '@/shared/components/CopyButton'
import {
  FileDropZone,
  FileGlyph,
  HexTable,
  PreviewDialog,
  artifactFromBytes,
  createArtifact,
  type FileArtifact,
} from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'
import { PanelError, PanelSection } from './controls'
import { readBytes } from './convert'

interface Loaded {
  file: File
  bytes: Uint8Array
}

const HEX_STEP = 512
const HEX_MAX = 16 * 1024
const BASE64_COPY_LIMIT = 8 * 1024 * 1024

function EntropyGauge({ entropy }: { entropy: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const ratio = Math.min(1, entropy / 8)
  const verdict = entropy < 5 ? 'low' : entropy < 7.2 ? 'mid' : 'high'
  const color = verdict === 'low' ? 'var(--hero-from)' : verdict === 'mid' ? 'var(--hero-via, var(--primary))' : 'var(--hero-to)'
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 68" className="w-40" role="img" aria-label={t('fs.inspect.entropyValue', { value: entropy.toFixed(2) })}>
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" strokeLinecap="round" />
        <motion.path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: ratio }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <text x="60" y="54" textAnchor="middle" className="fill-foreground text-[18px] font-semibold tabular-nums">
          {entropy.toFixed(2)}
        </text>
        <text x="60" y="66" textAnchor="middle" className="fill-muted-foreground text-[7px]">
          {t('fs.inspect.bitsPerByte')}
        </text>
      </svg>
      <figcaption className="text-center text-[11px] font-medium">{t(`fs.inspect.entropy.${verdict}`)}</figcaption>
    </figure>
  )
}

function ByteHistogram({ histogram }: { histogram: Uint32Array }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const max = Math.log1p(Math.max(...histogram))
  const tone = (byte: number) =>
    byte < 32 || byte === 127 ? 'fill-amber-500' : byte < 127 ? 'fill-primary' : 'fill-violet-500'
  return (
    <figure className="flex min-w-0 flex-1 flex-col gap-1.5">
      <svg viewBox="0 0 256 64" preserveAspectRatio="none" className="h-24 w-full" role="img" aria-label={t('fs.inspect.histogram')}>
        <motion.g
          style={{ transformOrigin: '0 64px', transformBox: 'view-box' }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {Array.from(histogram, (count, byte) => {
            const height = max > 0 ? (Math.log1p(count) / max) * 62 : 0
            return height > 0 ? <rect key={byte} x={byte} y={64 - height} width={0.9} height={height} className={tone(byte)} /> : null
          })}
        </motion.g>
      </svg>
      <figcaption className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-amber-500" aria-hidden />
          {t('fs.inspect.control')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-primary" aria-hidden />
          {t('fs.inspect.ascii')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm bg-violet-500" aria-hidden />
          {t('fs.inspect.high')}
        </span>
      </figcaption>
    </figure>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border bg-background/60 px-2.5 py-1.5">
      <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate text-xs font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function Base64Decoder({ onArtifact }: { onArtifact: (artifact: FileArtifact) => void }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [name, setName] = useState('decoded')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const decode = async () => {
    setBusy(true)
    setError(null)
    try {
      const { bytes, mime } = base64ToBytes(input)
      const detected = detectSignature(bytes)
      const ext = detected?.ext ?? (mime?.split('/')[1]?.replace(/\+.*$/, '') || 'bin')
      const stem = name.trim().replace(/[\\/:*?"<>|]+/g, '') || 'decoded'
      onArtifact(await artifactFromBytes(stem.includes('.') ? stem : `${stem}.${ext}`, bytes))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PanelSection title={t('fs.inspect.decodeTitle')} icon={<BinaryIcon />}>
      <Textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={t('fs.inspect.decodePlaceholder')}
        aria-label={t('fs.inspect.decodeTitle')}
        className="h-24 resize-y font-mono text-xs"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">{t('fs.inspect.decodeName')}</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8" />
        </label>
        <Button onClick={() => void decode()} disabled={!input.trim() || busy}>
          {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <BinaryIcon aria-hidden />}
          {t('fs.inspect.decode')}
        </Button>
      </div>
      {error && <PanelError message={error} />}
    </PanelSection>
  )
}

export function InspectPanel() {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [hashes, setHashes] = useState<Partial<Record<HashAlgorithm, string>>>({})
  const [expected, setExpected] = useState('')
  const [hexLength, setHexLength] = useState(HEX_STEP)
  const [error, setError] = useState<string | null>(null)
  const [artifact, setArtifact] = useState<FileArtifact | null>(null)

  const open = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      const bytes = await readBytes(file)
      setHashes({})
      setHexLength(HEX_STEP)
      setExpected('')
      setError(null)
      setLoaded({ file, bytes })
    } catch {
      setError(t('fs.readError', { name: file.name }))
    }
  }

  useEffect(() => {
    if (!loaded) return
    let cancelled = false
    void (async () => {
      for (const algorithm of HASH_ALGORITHMS) {
        const value = await hashBytes(loaded.bytes, algorithm)
        if (cancelled) return
        setHashes((current) => ({ ...current, [algorithm]: value }))
        await new Promise((resolve) => window.setTimeout(resolve, 0))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loaded])

  const facts = useMemo(() => {
    if (!loaded) return null
    const signature = detectSignature(loaded.bytes)
    return {
      signature,
      matches: extensionMatches(loaded.file.name, signature),
      text: textProfile(loaded.bytes),
      bytes: byteProfile(loaded.bytes),
    }
  }, [loaded])

  const rows = useMemo(() => (loaded ? hexRows(loaded.bytes, 0, hexLength) : []), [loaded, hexLength])
  const matched = matchHash(expected, hashes)

  const fixText = (mode: 'LF' | 'CRLF' | 'BOM') => {
    if (!loaded) return
    const text = new TextDecoder().decode(loaded.bytes).replace(/^\ufeff/, '')
    const output = mode === 'BOM' ? text : convertLineEndings(text, mode)
    setArtifact(
      createArtifact({
        name: loaded.file.name,
        format: mode === 'BOM' ? 'UTF-8' : mode,
        blob: new Blob([output], { type: loaded.file.type || 'text/plain;charset=utf-8' }),
        source: { name: loaded.file.name, size: loaded.file.size },
        preview: { kind: 'text', text: output, language: 'text' },
      }),
    )
  }

  const saveBase64 = () => {
    if (!loaded) return
    const text = bytesToBase64(loaded.bytes)
    setArtifact(
      createArtifact({
        name: `${loaded.file.name}.base64.txt`,
        format: 'Base64',
        blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
        source: { name: loaded.file.name, size: loaded.file.size },
        preview: { kind: 'text', text, language: 'text' },
      }),
    )
  }

  const base64 = useMemo(
    () => (loaded && loaded.bytes.length <= BASE64_COPY_LIMIT ? bytesToBase64(loaded.bytes) : ''),
    [loaded],
  )
  const mime = loaded ? facts?.signature?.mime || loaded.file.type || 'application/octet-stream' : ''

  return (
    <div className="flex flex-col gap-3">
      {!loaded || !facts ? (
        <>
          <FileDropZone title={t('fs.inspect.dropTitle')} hint={t('fs.inspect.dropHint')} glyphs={['EXE', 'SHA', 'PNG']} onFiles={(files) => void open(files)} />
          {error && <PanelError message={error} />}
        </>
      ) : (
        <>
          <PanelSection
            title={t('fs.inspect.identity')}
            icon={<ScanSearchIcon />}
            actions={
              <Button variant="ghost" size="xs" onClick={() => setLoaded(null)}>
                <XIcon aria-hidden />
                {t('fs.inspect.close')}
              </Button>
            }
          >
            <div className="flex items-center gap-3">
              <motion.div initial={{ rotate: -8, scale: 0.85, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }}>
                <FileGlyph extension={extensionOf(loaded.file.name) || facts.signature?.ext || 'bin'} className="h-14" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={loaded.file.name}>
                  {loaded.file.name}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatBytes(loaded.file.size)} · {t('fs.inspect.bytes', { count: loaded.file.size, formatted: loaded.file.size.toLocaleString() })}
                </p>
                <p
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    facts.matches === true && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
                    facts.matches === false && 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
                    facts.matches === null && 'bg-muted text-muted-foreground',
                  )}
                >
                  {facts.matches === true && <CircleCheckIcon className="size-3" aria-hidden />}
                  {facts.matches === false && <TriangleAlertIcon className="size-3" aria-hidden />}
                  {facts.matches === null && <CircleHelpIcon className="size-3" aria-hidden />}
                  {facts.matches === true
                    ? t('fs.inspect.matches', { type: facts.signature?.label })
                    : facts.matches === false
                      ? t('fs.inspect.mismatch', { type: facts.signature?.label, ext: extensionOf(loaded.file.name) })
                      : facts.signature
                        ? facts.signature.label
                        : t('fs.inspect.unknown')}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-1.5 @[560px]:grid-cols-4">
              <Fact label={t('fs.inspect.detected')}>{facts.signature?.label ?? t('fs.inspect.unknownShort')}</Fact>
              <Fact label={t('fs.inspect.mime')}>{mime}</Fact>
              <Fact label={t('fs.inspect.browserType')}>{loaded.file.type || '—'}</Fact>
              <Fact label={t('fs.inspect.modified')}>{loaded.file.lastModified ? new Date(loaded.file.lastModified).toLocaleString() : '—'}</Fact>
            </dl>
          </PanelSection>

          <PanelSection title={t('fs.inspect.hashes')} icon={<FingerprintIcon />}>
            <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background/60">
              {HASH_ALGORITHMS.map((algorithm) => {
                const value = hashes[algorithm]
                return (
                  <li key={algorithm} className={cn('flex items-center gap-2 px-2.5 py-1.5 transition-colors', matched === algorithm && 'bg-emerald-500/10')}>
                    <span className="w-16 shrink-0 text-[11px] font-semibold text-muted-foreground">{algorithm}</span>
                    {value ? (
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px]" title={value}>
                        {value}
                      </code>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
                        <LoaderCircleIcon className="size-3 animate-spin" aria-hidden />
                        {t('fs.inspect.hashing')}
                      </span>
                    )}
                    {value && <CopyButton text={value} label={t('fs.inspect.copyHash', { algorithm })} />}
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-col gap-1">
              <label htmlFor="file-inspect-verify" className="text-[11px] font-medium text-muted-foreground">
                {t('fs.inspect.verify')}
              </label>
              <Input
                id="file-inspect-verify"
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                placeholder={t('fs.inspect.verifyPlaceholder')}
                className="h-8 font-mono text-xs"
                spellCheck={false}
                aria-describedby="file-inspect-verify-result"
              />
              <p id="file-inspect-verify-result" role="status" className="min-h-4 text-[11px]">
                {expected.trim() &&
                  (matched ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                      <CircleCheckIcon className="size-3" aria-hidden />
                      {t('fs.inspect.verified', { algorithm: matched })}
                    </span>
                  ) : Object.keys(hashes).length < HASH_ALGORITHMS.length ? (
                    <span className="text-muted-foreground">{t('fs.inspect.hashing')}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-destructive">
                      <TriangleAlertIcon className="size-3" aria-hidden />
                      {t('fs.inspect.noMatch')}
                    </span>
                  ))}
              </p>
            </div>
          </PanelSection>

          <PanelSection title={t('fs.inspect.content')} icon={<GaugeIcon />}>
            <div className="flex flex-col items-center gap-4 @[560px]:flex-row @[560px]:items-end">
              <EntropyGauge entropy={facts.bytes.entropy} />
              <ByteHistogram histogram={facts.bytes.histogram} />
            </div>
            {facts.bytes.sampled && <p className="text-[11px] text-muted-foreground">{t('fs.inspect.sampled')}</p>}
          </PanelSection>

          {facts.text && (
            <PanelSection title={t('fs.inspect.text')} icon={<TextIcon />}>
              <dl className="grid grid-cols-2 gap-1.5 @[560px]:grid-cols-5">
                <Fact label={t('fs.inspect.encoding')}>
                  {facts.text.bom === 'utf-16le' || facts.text.bom === 'utf-16be'
                    ? facts.text.bom.toUpperCase()
                    : facts.text.validUtf8
                      ? 'UTF-8'
                      : t('fs.inspect.notUtf8')}
                  {facts.text.bom === 'utf-8' && ' + BOM'}
                </Fact>
                <Fact label={t('fs.inspect.lineEndings')}>{facts.text.lineEnding}</Fact>
                <Fact label={t('fs.inspect.lines')}>{facts.text.lines.toLocaleString()}</Fact>
                <Fact label={t('fs.inspect.words')}>{facts.text.words.toLocaleString()}</Fact>
                <Fact label={t('fs.inspect.chars')}>{facts.text.characters.toLocaleString()}</Fact>
              </dl>
              {facts.text.validUtf8 && (
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="xs" onClick={() => fixText('LF')} disabled={facts.text.lineEnding === 'LF' || facts.text.lineEnding === 'none'}>
                    {t('fs.inspect.toLf')}
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => fixText('CRLF')} disabled={facts.text.lineEnding === 'CRLF' || facts.text.lineEnding === 'none'}>
                    {t('fs.inspect.toCrlf')}
                  </Button>
                  {facts.text.bom === 'utf-8' && (
                    <Button variant="outline" size="xs" onClick={() => fixText('BOM')}>
                      {t('fs.inspect.removeBom')}
                    </Button>
                  )}
                </div>
              )}
            </PanelSection>
          )}

          <PanelSection
            title={t('fs.inspect.hex')}
            icon={<BinaryIcon />}
            actions={
              <div className="flex items-center gap-1">
                {base64 && <CopyButton text={base64} size="xs" label={t('fs.inspect.copyBase64')} />}
                {base64 && <CopyButton text={`data:${mime};base64,${base64}`} size="xs" label={t('fs.inspect.copyDataUrl')} />}
                <Button variant="ghost" size="xs" onClick={saveBase64}>
                  {t('fs.inspect.saveBase64')}
                </Button>
              </div>
            }
          >
            <HexTable rows={rows} />
            {hexLength < Math.min(loaded.bytes.length, HEX_MAX) && (
              <Button variant="outline" size="xs" className="self-start" onClick={() => setHexLength((value) => value + HEX_STEP * 2)}>
                {t('fs.inspect.moreBytes')}
              </Button>
            )}
          </PanelSection>
        </>
      )}

      <Base64Decoder onArtifact={setArtifact} />

      <PreviewDialog
        artifacts={artifact ? [artifact] : []}
        index={artifact ? 0 : null}
        onIndexChange={(index) => {
          if (index === null) setArtifact(null)
        }}
      />
    </div>
  )
}
