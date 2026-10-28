import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { LoaderCircleIcon } from 'lucide-react'

import { useShortcutDisplay } from '@/features/shortcuts/useShortcutDisplay'
import { cn } from '@/shared/utils/cn'

import { LAUNCHER_MODES, type LauncherMode, type LauncherModeMeta } from './modes'
import type { CaptureRun } from './useCaptureRun'

const ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] as const } },
}

function useModeShortcuts(): Record<string, string> {
  return {
    'capture-entire': useShortcutDisplay('capture-entire'),
    'capture-visible': useShortcutDisplay('capture-visible'),
    'capture-selection': useShortcutDisplay('capture-selection'),
    'capture-element': useShortcutDisplay('capture-element'),
    'capture-menu': useShortcutDisplay('capture-menu'),
  }
}

function ModeTile({
  meta,
  hint,
  shortcut,
  run,
  disabled,
  describedBy,
  onStart,
}: {
  meta: LauncherModeMeta
  hint: string
  shortcut?: string
  run: CaptureRun
  disabled: boolean
  describedBy?: string
  onStart: (mode: LauncherMode) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const Icon = meta.icon
  const active = run.phase !== 'idle' && run.mode === meta.id
  const working = active && run.phase === 'running'

  return (
    <button
      type="button"
      disabled={disabled}
      aria-describedby={describedBy}
      aria-keyshortcuts={shortcut}
      onClick={() => onStart(meta.id)}
      className={cn(
        'group/tile relative flex h-full min-h-16 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border bg-background/70 px-3 py-2.5 text-left shadow-xs outline-none',
        'transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring',
        'enabled:hover:-translate-y-0.5 enabled:hover:border-primary/30 enabled:hover:bg-card enabled:hover:shadow-md enabled:active:translate-y-0 enabled:active:scale-[0.985]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        active && 'border-primary/50 bg-primary/[0.06] ring-2 ring-primary/25 disabled:cursor-progress disabled:opacity-100',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent transition-transform duration-700 ease-out group-enabled/tile:group-hover/tile:translate-x-[400%] motion-reduce:hidden"
      />
      <span
        aria-hidden
        className={cn(
          'relative flex size-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-enabled/tile:group-hover/tile:scale-110 group-enabled/tile:group-hover/tile:-rotate-6 [&_svg]:size-4',
          meta.tone,
        )}
      >
        {working ? <LoaderCircleIcon className="animate-spin" /> : <Icon />}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm leading-tight font-medium">{t(meta.labelKey)}</span>
        <span className="truncate text-[11px] leading-tight text-muted-foreground">{hint}</span>
      </span>
      {shortcut && (
        <kbd className="relative hidden shrink-0 rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground shadow-[0_1px_0_var(--border)] @[400px]:inline-block">
          {shortcut}
        </kbd>
      )}
      {active && run.phase === 'countdown' && (
        <motion.span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-[var(--hero-from)] to-[var(--hero-to)]"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={reduce ? { duration: 0 } : { duration: run.total, ease: 'linear' }}
        />
      )}
    </button>
  )
}

/** Capture mode tiles, in a grid that widens from one to three columns with the panel. */
export function ModeGrid({
  run,
  blocked,
  describedBy,
  windowTabs,
  onStart,
}: {
  run: CaptureRun
  /** The page can't be captured; the tiles stay visible but disabled. */
  blocked: boolean
  describedBy?: string
  windowTabs: number
  onStart: (mode: LauncherMode) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const shortcuts = useModeShortcuts()
  const busy = run.phase !== 'idle'

  return (
    <motion.ul
      className="grid grid-cols-1 gap-2 @[600px]:grid-cols-2 @[940px]:grid-cols-3"
      initial={reduce ? false : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.045 } } }}
    >
      {LAUNCHER_MODES.map((meta) => {
        const shortcut = meta.command ? shortcuts[meta.command] : undefined
        const noTabs = meta.id === 'all-tabs' && windowTabs === 0
        const hint = noTabs ? t('capture.launcher.allTabsNone') : t(meta.hintKey, { count: windowTabs })
        return (
          <motion.li key={meta.id} variants={ITEM}>
            <ModeTile
              meta={meta}
              hint={hint}
              shortcut={shortcut && shortcut !== '—' ? shortcut : undefined}
              run={run}
              disabled={blocked || busy || noTabs}
              describedBy={blocked ? describedBy : undefined}
              onStart={onStart}
            />
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
