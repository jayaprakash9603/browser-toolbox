import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PauseIcon, PlayIcon, RotateCcwIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useProductivityTool } from '../_shared'

function formatMs(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function TimerTool() {
  const { t } = useTranslation()
  const tool = useProductivityTool('productivity.timer')
  const [tab, setTab] = useState<'countdown' | 'stopwatch' | 'pomodoro'>('countdown')

  const [minutesText, setMinutesText] = useState('5')
  const minutes = parseNumberInRange(minutesText, 1, 600)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [counting, setCounting] = useState(false)
  const endAt = useRef(0)

  const [elapsed, setElapsed] = useState(0)
  const [timing, setTiming] = useState(false)
  const startAt = useRef(0)

  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work')
  const [pomoRemaining, setPomoRemaining] = useState(25 * 60 * 1000)
  const [pomoRunning, setPomoRunning] = useState(false)
  const pomoEnd = useRef(0)

  useEffect(() => {
    const tick = () => {
      if (counting) setRemaining(Math.max(0, endAt.current - Date.now()))
      if (timing) setElapsed(Date.now() - startAt.current)
      if (pomoRunning) {
        const left = Math.max(0, pomoEnd.current - Date.now())
        setPomoRemaining(left)
        if (left === 0) {
          setPomoRunning(false)
          setPomoMode((m) => (m === 'work' ? 'break' : 'work'))
          setPomoRemaining(pomoMode === 'work' ? 5 * 60 * 1000 : 25 * 60 * 1000)
        }
      }
    }
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [counting, timing, pomoRunning, pomoMode])

  const startCountdown = () => {
    if (minutes === null) return
    endAt.current = Date.now() + minutes * 60000
    setRemaining(minutes * 60000)
    setCounting(true)
  }
  const startStopwatch = () => {
    startAt.current = Date.now() - elapsed
    setTiming(true)
  }
  const startPomo = () => {
    pomoEnd.current = Date.now() + pomoRemaining
    setPomoRunning(true)
  }

  return (
    <ToolPage tool={tool}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="countdown">{t('timer.countdown')}</TabsTrigger>
          <TabsTrigger value="stopwatch">{t('timer.stopwatch')}</TabsTrigger>
          <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
        </TabsList>

        <TabsContent value="countdown" className="mt-2 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <NumberField
              value={minutesText}
              onChange={setMinutesText}
              min={1}
              max={600}
              className="w-20"
              ariaLabel={t('timer.minutes')}
              disabled={counting}
            />
            <span className="text-xs text-muted-foreground">{t('timer.minutes')}</span>
          </div>
          <p className="font-mono text-4xl font-semibold tabular-nums">
            {formatMs(remaining ?? (minutes ?? 0) * 60000)}
          </p>
          <div className="flex gap-1.5">
            {!counting ? (
              <Button size="sm" onClick={startCountdown} disabled={minutes === null}>
                <PlayIcon /> {t('timer.start')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setCounting(false)}>
                <PauseIcon /> {t('timer.pause')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCounting(false)
                setRemaining(null)
              }}
            >
              <RotateCcwIcon /> {t('timer.reset')}
            </Button>
          </div>
          {remaining === 0 && (
            <p className="text-xs font-medium text-green-600 dark:text-green-400">
              {t('timer.done')}
            </p>
          )}
        </TabsContent>

        <TabsContent value="stopwatch" className="mt-2 flex flex-col items-center gap-3">
          <p className="font-mono text-4xl font-semibold tabular-nums">{formatMs(elapsed)}</p>
          <div className="flex gap-1.5">
            {!timing ? (
              <Button size="sm" onClick={startStopwatch}>
                <PlayIcon /> {t('timer.start')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setTiming(false)}>
                <PauseIcon /> {t('timer.pause')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTiming(false)
                setElapsed(0)
              }}
            >
              <RotateCcwIcon /> {t('timer.reset')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="pomodoro" className="mt-2 flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            {pomoMode === 'work' ? t('timer.pomoWork') : t('timer.pomoBreak')}
          </p>
          <p className="font-mono text-4xl font-semibold tabular-nums">{formatMs(pomoRemaining)}</p>
          <div className="flex gap-1.5">
            {!pomoRunning ? (
              <Button size="sm" onClick={startPomo}>
                <PlayIcon /> {t('timer.start')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setPomoRunning(false)}>
                <PauseIcon /> {t('timer.pause')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setPomoRunning(false)
                setPomoMode('work')
                setPomoRemaining(25 * 60 * 1000)
              }}
            >
              <RotateCcwIcon /> {t('timer.reset')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </ToolPage>
  )
}
