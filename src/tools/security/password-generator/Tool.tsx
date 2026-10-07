import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import { generatePasswords, DEFAULT_PASSWORD_OPTIONS, type PasswordOptions } from '@/core/engines/password'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { ToolActions } from '@/tools/text/_shared'
import { useSecurityTool } from '../_shared'

const OPTION_KEYS: { key: 'uppercase' | 'lowercase' | 'numbers' | 'symbols' | 'excludeAmbiguous'; labelKey: string }[] = [
  { key: 'uppercase', labelKey: 'security.optUpper' },
  { key: 'lowercase', labelKey: 'security.optLower' },
  { key: 'numbers', labelKey: 'security.optNumbers' },
  { key: 'symbols', labelKey: 'security.optSymbols' },
  { key: 'excludeAmbiguous', labelKey: 'security.optNoAmbiguous' },
]

export default function PasswordGeneratorTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.password-generator')
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [count, setCount] = useState(1)
  const [output, setOutput] = useState<string[]>([])

  const generate = () => {
    const results = generatePasswords(options, count)
    const first = results[0]
    if (first && !first.ok) { setOutput([]); return }
    setOutput(results.flatMap((r) => (r.ok ? [r.value] : [])))
  }

  const noCharset = !options.uppercase && !options.lowercase && !options.numbers && !options.symbols

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs">
            {t('security.length')}
            <Input type="number" min={4} max={256} value={options.length} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setOptions((o) => ({ ...o, length: Math.min(Math.max(4, v), 256) })) }} className="w-20" aria-label={t('security.length')} />
          </label>
          <label className="flex items-center gap-2 text-xs">
            {t('text.count')}
            <Input type="number" min={1} max={50} value={count} onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v)) setCount(Math.min(Math.max(1, v), 50)) }} className="w-16" aria-label={t('text.count')} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {OPTION_KEYS.map(({ key, labelKey }) => (
            <label key={key} className="flex items-center gap-1.5 text-xs">
              <Switch checked={options[key]} onCheckedChange={(v) => setOptions((o) => ({ ...o, [key]: v }))} aria-label={t(labelKey)} />
              {t(labelKey)}
            </label>
          ))}
        </div>
        {noCharset && <JsonErrorView message={t('security.needCharset')} />}
        <Button size="sm" className="w-fit" onClick={generate} disabled={noCharset}>
          <RefreshCwIcon /> {t('text.generate')}
        </Button>
        {output.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output.join('\n')} onClear={() => setOutput([])} />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {output.map((password, index) => (
                <div key={index} className="flex items-center justify-between gap-1 rounded border bg-muted/40 px-2 py-1">
                  <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{password}</code>
                  <CopyButton text={password} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
