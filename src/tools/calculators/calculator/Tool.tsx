import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { HistoryIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { evaluate } from '@/core/engines/calc'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { useCalcTool } from '../_shared'

import { CalcDisplay } from './Display'
import { HistoryPanel, type HistoryEntry } from './HistoryPanel'
import { Keypad } from './Keypad'
import {
  appendKey,
  backspaceExpr,
  formatResult,
  keyboardToKeyId,
  KEYPAD_ROWS,
  livePreview,
  MEMORY_KEYS,
  negateExpr,
  SCIENTIFIC_ROW,
  type CalcKey,
  type CalcMode,
} from './logic'

const HISTORY_MAX = 24
let historySeq = 0

export default function CalculatorTool() {
  const { t } = useTranslation()
  const tool = useCalcTool('calculators.calculator')
  const historyBtnId = useId()
  const [mode, setMode] = useState<CalcMode>('standard')
  const [expr, setExpr] = useState('')
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [memory, setMemory] = useState<number | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const exprRef = useRef(expr)
  const lastResultRef = useRef(lastResult)
  const memoryRef = useRef(memory)

  useEffect(() => {
    exprRef.current = expr
  }, [expr])
  useEffect(() => {
    lastResultRef.current = lastResult
  }, [lastResult])
  useEffect(() => {
    memoryRef.current = memory
  }, [memory])

  const preview = useMemo(() => livePreview(expr), [expr])

  const flashKey = useCallback((id: string) => {
    setActiveKey(id)
    window.setTimeout(() => setActiveKey((current) => (current === id ? null : current)), 120)
  }, [])

  const commitResult = useCallback(() => {
    const trimmed = exprRef.current.trim()
    if (!trimmed) return
    const out = evaluate(trimmed)
    if (!out.ok) return
    const formatted = formatResult(out.value)
    historySeq += 1
    setHistory((entries) => [{ id: `h-${historySeq}`, expr: trimmed, result: formatted }, ...entries].slice(0, HISTORY_MAX))
    setLastResult(formatted)
    setExpr(formatted)
  }, [])

  const applyMemory = useCallback((op: 'add' | 'sub' | 'recall' | 'clear') => {
    if (op === 'clear') {
      setMemory(null)
      return
    }
    if (op === 'recall') {
      const mem = memoryRef.current
      if (mem != null) setExpr((current) => `${current}${formatResult(mem)}`)
      return
    }
    const trimmed = exprRef.current.trim()
    let out = trimmed ? evaluate(trimmed) : null
    if (!out?.ok && lastResultRef.current) {
      const value = Number(lastResultRef.current)
      if (Number.isFinite(value)) out = { ok: true, value }
    }
    if (!out?.ok) return
    setMemory((current) => {
      const base = current ?? 0
      return op === 'add' ? base + out.value : base - out.value
    })
  }, [])

  const handleKey = useCallback(
    (key: CalcKey) => {
      flashKey(key.id)
      switch (key.id) {
        case 'clear':
          setExpr('')
          return
        case 'backspace':
          setExpr((current) => backspaceExpr(current))
          return
        case 'negate':
          setExpr((current) => negateExpr(current))
          return
        case 'ans':
          if (lastResultRef.current) setExpr((current) => `${current}${lastResultRef.current}`)
          return
        case 'equals':
          commitResult()
          return
        case 'mc':
          applyMemory('clear')
          return
        case 'mr':
          applyMemory('recall')
          return
        case 'm-plus':
          applyMemory('add')
          return
        case 'm-minus':
          applyMemory('sub')
          return
        default:
          if (key.append) setExpr((current) => appendKey(current, key))
      }
    },
    [applyMemory, commitResult, flashKey],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return
      const id = keyboardToKeyId(event)
      if (!id) return
      event.preventDefault()
      const allKeys = [...MEMORY_KEYS, ...SCIENTIFIC_ROW, ...KEYPAD_ROWS.flat()]
      const match = allKeys.find((k) => k.id === id)
      if (match) handleKey(match)
      else if (id === 'equals') handleKey({ id: 'equals', label: '=', kind: 'action' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  return (
    <ToolPage tool={tool} contentClassName="@container flex min-h-0 flex-col gap-3">
      <MotionConfig reducedMotion="user">
        <Segmented
          ariaLabel={t('calcTool.mode.label')}
          value={mode}
          onValueChange={setMode}
          size="sm"
          className="w-full"
          options={[
            { value: 'standard', label: t('calcTool.mode.standard') },
            { value: 'scientific', label: t('calcTool.mode.scientific') },
          ]}
        />
        <CalcDisplay expr={expr} preview={preview} memoryActive={memory != null} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{t('calcTool.keyboardHint')}</p>
          <Button
            type="button"
            id={historyBtnId}
            variant={historyOpen ? 'secondary' : 'outline'}
            size="xs"
            className="cursor-pointer gap-1"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <HistoryIcon className="size-3.5" aria-hidden />
            {t('calcTool.history')}
            {history.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 font-mono text-[10px] text-primary">{history.length}</span>
            )}
          </Button>
        </div>
        <Keypad
          memoryRow={MEMORY_KEYS}
          scientificRow={mode === 'scientific' ? SCIENTIFIC_ROW : undefined}
          rows={KEYPAD_ROWS}
          activeKey={activeKey}
          onPress={handleKey}
        />
        <HistoryPanel
          open={historyOpen}
          entries={history}
          onPick={(entry) => setExpr(entry.expr)}
          onClear={() => setHistory([])}
        />
      </MotionConfig>
    </ToolPage>
  )
}
