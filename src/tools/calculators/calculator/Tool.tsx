import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { evaluate } from '@/core/engines/calc'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useCalcTool } from '../_shared'

const KEYS = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','%','+','(',')','^','sqrt']
const FN = ['sin','cos','tan','ln','log','abs','pi']

export default function CalculatorTool() {
  const { t } = useTranslation()
  const tool = useCalcTool('calculators.calculator')
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])

  const result = useMemo(() => (expr.trim() ? evaluate(expr) : null), [expr])

  const press = (key: string) => setExpr((e) => e + (FN.includes(key) ? `${key}(` : key))
  const submit = () => {
    if (result?.ok) {
      setHistory((h) => [{ expr, result: String(result.value) }, ...h].slice(0, 10))
      setExpr(String(result.value))
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Input value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="2 + 3 * (4 - 1)" aria-label={t('calc.input')} className="flex-1 font-mono text-sm" />
          <Button size="sm" onClick={submit} disabled={!result?.ok}>=</Button>
          <Button size="sm" variant="ghost" onClick={() => setExpr('')}>C</Button>
        </div>
        {result && !result.ok && <JsonErrorView message={result.error} />}
        {result?.ok && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2">
            <code className="font-mono text-lg font-semibold">{result.value}</code>
            <CopyButton text={String(result.value)} />
          </div>
        )}
        <div className="grid grid-cols-4 gap-1">
          {KEYS.map((key) => (
            <Button key={key} variant="outline" size="sm" className="font-mono" onClick={() => press(key)}>{key}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {FN.map((fn) => (
            <Button key={fn} variant="ghost" size="xs" className="font-mono" onClick={() => press(fn)}>{fn}</Button>
          ))}
        </div>
        {history.length > 0 && (
          <div className="max-h-40 space-y-0.5 overflow-y-auto border-t pt-2">
            {history.map((entry, index) => (
              <button key={index} type="button" onClick={() => setExpr(entry.expr)} className="flex w-full justify-between rounded px-1.5 py-0.5 text-left font-mono text-[11px] hover:bg-accent">
                <span className="text-muted-foreground">{entry.expr}</span>
                <span>= {entry.result}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </ToolPage>
  )
}
