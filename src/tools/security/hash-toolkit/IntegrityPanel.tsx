import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  FileTextIcon,
  UploadIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { HashedItem } from '@/core/engines/hash/manifest'
import { parseManifest, verifyManifest } from '@/core/engines/hash/manifest'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

const STATUS_ICON = {
  verified: CircleCheckIcon,
  modified: CircleAlertIcon,
  missing: CircleDashedIcon,
  pending: CircleDashedIcon,
} as const

export function IntegrityPanel({ items }: { items: HashedItem[] }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [manifestText, setManifestText] = useState('')

  const parsed = useMemo(() => parseManifest(manifestText), [manifestText])
  const verification = useMemo(
    () => (manifestText.trim() ? verifyManifest(parsed, items) : null),
    [manifestText, parsed, items],
  )

  const loadFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md5,.sha256,.manifest,text/plain'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      void file.text().then(setManifestText)
    }
    input.click()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border bg-background/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-medium" htmlFor="manifest-input">
            {t('hashToolkit.integrity.manifest')}
          </label>
          <Button type="button" size="xs" variant="outline" onClick={loadFile}>
            <UploadIcon className="size-3" />
            {t('hashToolkit.integrity.load')}
          </Button>
        </div>
        <Textarea
          id="manifest-input"
          value={manifestText}
          onChange={(e) => setManifestText(e.target.value)}
          placeholder={t('hashToolkit.integrity.placeholder')}
          className="mt-2 min-h-28 font-mono text-[11px]"
          spellCheck={false}
        />
        {parsed.invalidLines.length > 0 && (
          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
            {t('hashToolkit.integrity.invalidLines', { lines: parsed.invalidLines.join(', ') })}
          </p>
        )}
      </div>

      {!verification && (
        <p className="text-center text-xs text-muted-foreground">
          {t('hashToolkit.integrity.empty')}
        </p>
      )}

      {verification && (
        <motion.ul
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-1.5"
        >
          {verification.rows.map(({ entry, status, item }) => {
            const Icon = STATUS_ICON[status]
            const tone =
              status === 'verified'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : status === 'modified'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-border bg-muted/20'
            return (
              <li
                key={`${entry.line}-${entry.name}`}
                className={cn(
                  'flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px]',
                  tone,
                )}
              >
                <Icon
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    status === 'verified' && 'text-emerald-600',
                    status === 'modified' && 'text-red-600',
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{entry.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {entry.algorithm} · {entry.hex.slice(0, 16)}…
                  </p>
                  {item && status === 'modified' && item.digests[entry.algorithm] && (
                    <p className="mt-0.5 font-mono text-[10px] text-red-600 dark:text-red-400">
                      {t('hashToolkit.integrity.actual')}: {item.digests[entry.algorithm]}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`hashToolkit.integrity.status.${status}`)}
                </span>
              </li>
            )
          })}
        </motion.ul>
      )}

      {verification && verification.unlisted.length > 0 && (
        <div className="rounded-xl border border-dashed p-3">
          <p className="flex items-center gap-1 text-[11px] font-medium">
            <FileTextIcon className="size-3.5" aria-hidden />
            {t('hashToolkit.integrity.unlisted', { count: verification.unlisted.length })}
          </p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {verification.unlisted.slice(0, 8).map((item) => (
              <li key={item.id} className="truncate">
                {item.path}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
