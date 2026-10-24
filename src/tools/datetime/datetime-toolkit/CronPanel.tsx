import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { BookOpenIcon, CalendarClockIcon, ChevronDownIcon, RepeatIcon, XIcon } from 'lucide-react'

import { parseCron } from '@/core/engines/date'
import { CopyButton } from '@/shared/components/CopyButton'
import { SectionCard } from '@/shared/components/ValueCard'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'

import { CRON_PRESETS, cronFieldValues, nextCronRuns, relativeDayLabel } from './dateModel'
import { Chip, FieldLabel, InlineError } from './parts'

const FIELD_KEYS = ['minute', 'hour', 'dom', 'month', 'dow'] as const
const RUN_COUNTS = ['5', '10', '20'] as const
const SYNTAX = [
  { token: '*', key: 'any' },
  { token: ',', key: 'list' },
  { token: '-', key: 'range' },
  { token: '/', key: 'step' },
  { token: 'MON', key: 'names' },
] as const

export function CronPanel({ initialInput = '' }: { initialInput?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [input, setInput] = useState(initialInput || '30 9 * * 1-5')
  const [count, setCount] = useState<(typeof RUN_COUNTS)[number]>('5')
  const cron = useMemo(() => (input.trim() ? parseCron(input) : null), [input])
  const runs = useMemo(
    () => (cron?.ok ? nextCronRuns(cron.fields, new Date(), Number(count)) : []),
    [cron, count],
  )
  const tokens = input.trim().split(/\s+/)
  const runsText = runs.map((run) => run.toLocaleString()).join('\n')

  return (
    <div className="flex flex-col gap-3">
      <SectionCard icon={RepeatIcon} title={t('dtk.cronTitle')} description={t('dtk.cronHint')} bodyClassName="flex flex-col gap-2.5">
        <FieldLabel label={t('dtk.cronInput')}>
          <div className="relative">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="*/15 9-17 * * 1-5"
              aria-label={t('dtk.cronInput')}
              spellCheck={false}
              className="h-10 pr-9 font-mono text-[14px] tracking-wide"
            />
            {input && (
              <Button
                size="icon-xs"
                variant="ghost"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={() => setInput('')}
                aria-label={t('dtk.clear')}
              >
                <XIcon />
              </Button>
            )}
          </div>
        </FieldLabel>
        <div className="flex flex-wrap gap-1.5" aria-label={t('dtk.presets')}>
          {CRON_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              active={input.trim() === preset.expression}
              onClick={() => setInput(preset.expression)}
              title={preset.expression}
            >
              {t(`dtk.preset.${preset.id}`)}
            </Chip>
          ))}
        </div>
      </SectionCard>

      {cron && !cron.ok && <InlineError>{cron.error}</InlineError>}

      {cron?.ok && (
        <>
          <motion.div
            key={cron.description}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/[0.05] px-3.5 py-3"
          >
            <CalendarClockIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1 text-[14px] leading-6 font-medium">{cron.description}</p>
            <CopyButton text={cron.description} />
          </motion.div>

          <div className="@container">
            <ol className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @xl:grid-cols-5">
              {cron.fields.map((field, index) => (
                <li
                  key={field.name}
                  className="flex min-w-0 flex-col gap-0.5 rounded-lg border bg-card px-2.5 py-2 shadow-xs"
                >
                  <span className="truncate text-xs font-medium text-muted-foreground">
                    {t(`dtk.cronField.${FIELD_KEYS[index]}`)}
                  </span>
                  <span className="font-mono text-[15px] font-semibold">{tokens[index]}</span>
                  <span className="text-xs break-words text-muted-foreground">
                    {field.values === 'any' ? t('dtk.cronEvery') : cronFieldValues(field)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <SectionCard
            icon={CalendarClockIcon}
            title={t('dtk.nextRuns')}
            description={t('dtk.nextRunsHint')}
            bodyClassName="p-0"
            actions={
              <>
                <Segmented
                  size="sm"
                  ariaLabel={t('dtk.runCount')}
                  value={count}
                  onValueChange={setCount}
                  options={RUN_COUNTS.map((value) => ({ value, label: value }))}
                />
                <CopyButton text={runsText} label={t('dtk.copyRuns')} />
              </>
            }
          >
            {runs.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-muted-foreground">{t('dtk.noRuns')}</p>
            ) : (
              <ol className="divide-y">
                {runs.map((run, index) => (
                  <motion.li
                    key={`${count}-${run.getTime()}`}
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index, 10) * 0.025 }}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] tabular-nums">
                      {run.toLocaleString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeDayLabel(run)}</span>
                  </motion.li>
                ))}
              </ol>
            )}
          </SectionCard>
        </>
      )}

      <details className="group rounded-xl border bg-card shadow-xs">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
          <BookOpenIcon className="size-4 text-muted-foreground" aria-hidden />
          <span className="flex-1">{t('dtk.cheatSheet')}</span>
          <ChevronDownIcon
            className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="flex flex-col gap-3 border-t px-3 py-3">
          <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px] text-muted-foreground">
            {FIELD_KEYS.map((key) => (
              <span key={key} className="rounded bg-muted px-1 py-1">
                {t(`dtk.cronFieldShort.${key}`)}
              </span>
            ))}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
            {SYNTAX.map((item) => (
              <div key={item.key} className="contents">
                <dt className="font-mono font-semibold text-primary">{item.token}</dt>
                <dd className="text-muted-foreground">{t(`dtk.syntax.${item.key}`)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </div>
  )
}
