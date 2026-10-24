import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileLockIcon,
  FileWarningIcon,
  FolderOpenIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'

import { formatBytes } from '@/core/engines/image'
import { downloadBlob } from '@/features/netmon/download'
import { bytesBlob, FileDropZone, FileGlyph } from '@/shared/components/files'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { usePdfSession, type OpenPdf } from './session'

export function PasswordField({
  id,
  value,
  onChange,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className="h-9 pr-9"
      />
      <button
        type="button"
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? t('pdf.password.hide') : t('pdf.password.show')}
        className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  )
}

function UnlockCard({ name, incorrect, unlocking }: { name: string; incorrect: boolean; unlocking: boolean }) {
  const { t } = useTranslation()
  const { unlock, close } = usePdfSession()
  const reduce = useReducedMotion()
  const [password, setPassword] = useState('')
  const id = useId()
  return (
    <motion.form
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-4 py-6 text-center shadow-xs"
      onSubmit={(event) => {
        event.preventDefault()
        if (password) void unlock(password)
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-32 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--hero-from)_18%,transparent),transparent)]"
      />
      <motion.span
        className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-300"
        animate={incorrect && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        key={incorrect ? 'shake' : 'still'}
        aria-hidden
      >
        <FileLockIcon className="size-6" />
      </motion.span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold">{t('pdf.password.lockedTitle')}</p>
        <p className="max-w-sm truncate text-xs text-muted-foreground" title={name}>
          {t('pdf.password.lockedText', { name })}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-1.5 text-left">
        <label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
          {t('pdf.password.label')}
        </label>
        <div className="flex gap-2">
          <PasswordField id={id} value={password} onChange={setPassword} invalid={incorrect} />
          <Button type="submit" disabled={!password || unlocking} className="h-9">
            {unlocking ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <KeyRoundIcon aria-hidden />}
            {t('pdf.password.unlock')}
          </Button>
        </div>
        {incorrect && (
          <p role="alert" className="text-[11px] text-destructive">
            {t('pdf.password.incorrect')}
          </p>
        )}
      </div>
      <Button type="button" variant="ghost" size="xs" onClick={close}>
        {t('pdf.doc.chooseAnother')}
      </Button>
    </motion.form>
  )
}

/** Drop zone, password prompt or error, shown until a document is ready. */
export function OpenDocument({ hint }: { hint: string }) {
  const { t } = useTranslation()
  const { state, open, close } = usePdfSession()

  if (state.status === 'locked') return <UnlockCard name={state.name} incorrect={state.incorrect} unlocking={state.unlocking} />
  if (state.status === 'opening') {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-card/60 text-xs text-muted-foreground" role="status">
        <LoaderCircleIcon className="size-5 animate-spin text-primary" aria-hidden />
        {t('pdf.doc.opening', { name: state.name })}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <FileDropZone
        title={t('pdf.doc.dropTitle')}
        hint={hint}
        accept="application/pdf,.pdf"
        glyphs={['DOCX', 'PDF', 'PNG']}
        onFiles={([file]) => file && void open(file)}
      />
      {state.status === 'error' && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <FileWarningIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{t('pdf.doc.invalid', { name: state.name })}</span>
          <button type="button" className="cursor-pointer font-medium underline-offset-2 hover:underline" onClick={close}>
            {t('pdf.doc.dismiss')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Name, size and page count of the open PDF, with replace, download and close. */
export function DocumentBar({ doc }: { doc: OpenPdf }) {
  const { t } = useTranslation()
  const { open, close } = usePdfSession()
  const reduce = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 shadow-xs"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={doc.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -10, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          className="shrink-0"
        >
          <FileGlyph extension="PDF" className="h-10" />
        </motion.span>
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold" title={doc.name}>
          {doc.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-muted-foreground">
          <span>{t('pdf.doc.pages', { count: doc.pages.length })}</span>
          <span aria-hidden>·</span>
          <span>{formatBytes(doc.bytes.length)}</span>
          {doc.password !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-1.5 py-px font-medium text-amber-700 dark:text-amber-300">
              <LockKeyholeIcon className="size-2.5" aria-hidden />
              {t('pdf.doc.protected')}
            </span>
          )}
          {doc.edited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-px font-medium text-primary">
              <SparklesIcon className="size-2.5" aria-hidden />
              {t('pdf.doc.edited')}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {doc.edited && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => downloadBlob(bytesBlob(doc.bytes, 'application/pdf'), doc.name)}
            aria-label={t('pdf.doc.download')}
            className="gap-1"
          >
            <DownloadIcon aria-hidden />
            <span className="hidden @[520px]:inline">{t('pdf.doc.download')}</span>
          </Button>
        )}
        <Button variant="ghost" size="xs" onClick={() => input.current?.click()} aria-label={t('pdf.doc.replace')} className="gap-1">
          <FolderOpenIcon aria-hidden />
          <span className="hidden @[520px]:inline">{t('pdf.doc.replace')}</span>
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={close} aria-label={t('pdf.doc.close')}>
          <XIcon />
        </Button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void open(file)
          }}
        />
      </div>
    </motion.div>
  )
}
