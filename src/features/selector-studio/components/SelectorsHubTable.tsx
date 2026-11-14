import { CopyIcon, Loader2Icon, PlayIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { SelectorCandidate } from '@/core/engines/selector-studio'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { candidateRowLabel } from './candidateRowLabel'

function matchBadge(candidate: SelectorCandidate): string | null {
  if (candidate.matchCount == null) return null
  return String(candidate.matchCount)
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
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-[11px] text-[var(--sh-muted,#57606a)]">
        <p>{t('studio.noElement')}</p>
      </div>
    )
  }

  const runRow = async (candidate: SelectorCandidate) => {
    setRunningId(candidate.id)
    try {
      await model.testCandidate(candidate)
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
          const isXPath = candidate.kind === 'xpath'
          const badge = matchBadge(candidate)
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
              <td className="w-[46px] py-2 pl-2 pr-1 align-middle">
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
              <td className="w-6 px-1 py-2 align-middle">
                {badge != null ? (
                  <span
                    className="flex size-[17px] items-center justify-center rounded-full bg-[#00adb5] text-[9.5px] font-bold text-white"
                    title={
                      candidate.uniqueness === 'unique'
                        ? t('studio.hub.uniqueCount', { count: candidate.matchCount })
                        : t('studio.hub.matchCount', { count: candidate.matchCount })
                    }
                  >
                    {badge}
                  </span>
                ) : (
                  <span className="inline-block size-[17px]" aria-hidden />
                )}
              </td>
              <td className="w-[110px] whitespace-nowrap px-1.5 py-2 align-middle font-medium text-[#24292f]">
                {candidateRowLabel(candidate)}
              </td>
              <td className="min-w-0 py-2 pl-1 pr-2 align-middle">
                <code
                  className={cn(
                    'code-font break-all font-mono leading-snug',
                    isXPath ? 'font-semibold text-[var(--sh-orange,#ff7700)]' : 'text-[#57606a]',
                  )}
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