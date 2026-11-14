import { CopyIcon, Loader2Icon, PlayIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { matchBadgeState, statusLabel, type SelectorCandidate } from '@/core/engines/selector-studio'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { candidateRowLabel } from './candidateRowLabel'

const BADGE_TONE: Record<ReturnType<typeof matchBadgeState>['tone'], string> = {
  unique: 'bg-[#16a34a]',
  multiple: 'bg-[#d97706]',
  none: 'bg-[#dc2626]',
  wrong: 'bg-[#b91c1c]',
  invalid: 'bg-[#dc2626]',
  untested: 'bg-[#94a3b8]',
  blocked: 'bg-[#64748b]',
}

export function SelectorsHubTable({
  model,
  items,
  fontScale,
  selectedId,
  onSelectId,
}: {
  model: SelectorStudioModel
  items: SelectorCandidate[]
  fontScale: 10 | 11 | 12
  selectedId: string | null
  onSelectId: (id: string) => void
}) {
  const { t } = useTranslation()
  const [runningId, setRunningId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-3 py-5 text-center text-[10px] leading-snug text-[var(--sh-muted,#57606a)]">
        <p className="max-w-[14rem]">{t('studio.noElement')}</p>
      </div>
    )
  }

  const runRow = async (candidate: SelectorCandidate) => {
    setRunningId(candidate.id)
    try {
      await model.testCandidate(candidate)
      await model.highlight(candidate)
    } finally {
      setRunningId(null)
    }
  }

  const copyRow = async (candidate: SelectorCandidate) => {
    try {
      await navigator.clipboard.writeText(candidate.expression)
      setCopiedId(candidate.id)
      window.setTimeout(() => setCopiedId(null), 700)
    } catch {
      /* ignore */
    }
  }

  return (
    <table className="w-full border-collapse text-left" style={{ fontSize: fontScale }}>
      <tbody>
        {items.map((candidate, index) => {
          const selected = selectedId === candidate.id || model.active?.id === candidate.id
          const isXPath =
            (candidate.kind === 'xpath' && !candidate.evaluateAs) ||
            (candidate.reasons.includes('Playwright') && candidate.expression.includes('xpath='))
          const badge = matchBadgeState(candidate)
          const zebra = index % 2 === 0

          return (
            <tr
              key={candidate.id}
              className={cn(
                'group cursor-pointer border-b border-[#edf0f2] transition-colors',
                zebra ? 'bg-[#fdfdfd]' : 'bg-[#f8f9fa]',
                'hover:bg-[#f3f4f6]',
                selected && 'border-l-4 border-l-[#1a73e8] bg-[#e8f0fe]',
                copiedId === candidate.id && 'animate-[copyFlash_0.7s_ease]',
              )}
              onClick={() => {
                onSelectId(candidate.id)
                model.setActive(candidate)
              }}
            >
              <td className="w-10 py-1 pl-1.5 pr-0.5 align-middle">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--sh-orange,#ff7700)] text-white transition hover:bg-[#e66a00] active:scale-90"
                    title={t('studio.test')}
                    onClick={(event) => {
                      event.stopPropagation()
                      void runRow(candidate)
                    }}
                  >
                    {runningId === candidate.id ? (
                      <Loader2Icon className="size-2 animate-spin" aria-hidden />
                    ) : (
                      <PlayIcon className="size-2 fill-current" aria-hidden />
                    )}
                  </button>
                  <button
                    type="button"
                    className="flex size-[18px] shrink-0 items-center justify-center text-[#57606a] transition hover:text-[var(--sh-orange,#ff7700)]"
                    title={t('studio.copy')}
                    onClick={(event) => {
                      event.stopPropagation()
                      void copyRow(candidate)
                    }}
                  >
                    {copiedId === candidate.id ? (
                      <span className="text-[10px] text-green-600">✓</span>
                    ) : (
                      <CopyIcon className="size-3" aria-hidden />
                    )}
                  </button>
                </div>
              </td>
              <td className="w-7 px-0.5 py-1 align-middle">
                <span
                  className={cn(
                    'flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white',
                    BADGE_TONE[badge.tone],
                  )}
                  title={statusLabel(candidate)}
                >
                  {badge.shortLabel}
                </span>
              </td>
              <td className="max-w-[5rem] px-1 py-1 align-middle text-[10px] font-medium text-[#24292f]">
                <span className="block truncate" title={candidateRowLabel(candidate)}>
                  {candidateRowLabel(candidate)}
                </span>
              </td>
              <td className="min-w-0 py-1 pl-0.5 pr-1.5 align-middle">
                <code
                  className={cn(
                    'code-font block max-w-full truncate font-mono leading-snug',
                    isXPath ? 'font-semibold text-[var(--sh-orange,#ff7700)]' : 'text-[#57606a]',
                  )}
                  title={candidate.expression}
                >
                  {candidate.expression}
                </code>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}