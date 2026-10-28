import { motion, useReducedMotion } from 'motion/react'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DIGEST_ALGORITHMS,
  formatDigest,
  type DigestFormat,
  type Digests,
} from '@/core/engines/hash/digests'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'

export function DigestList({
  digests,
  format = 'hex',
  highlight,
  className,
}: {
  digests: Digests
  format?: DigestFormat
  highlight?: string
  className?: string
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {DIGEST_ALGORITHMS.map((meta, index) => {
        const raw = digests[meta.id]
        if (!raw) return null
        const value = formatDigest(raw, format)
        const match = highlight?.toLowerCase() === raw.toLowerCase()
        return (
          <motion.li
            key={meta.id}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, delay: reduce ? 0 : index * 0.04 }}
            className={cn(
              'rounded-xl border bg-background/80 p-2 shadow-xs',
              match && 'border-emerald-500/50 ring-1 ring-emerald-500/25',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                  {meta.id}
                </Badge>
                {meta.strength === 'legacy' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangleIcon className="size-2.5" aria-hidden />
                    {t('hashToolkit.legacy')}
                  </span>
                )}
                {match && (
                  <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">
                    {t('hashToolkit.verify.match')}
                  </Badge>
                )}
              </div>
              <CopyButton text={value} />
            </div>
            <code className="mt-1 block break-all font-mono text-[11px] leading-relaxed">
              {value}
            </code>
          </motion.li>
        )
      })}
    </ul>
  )
}
