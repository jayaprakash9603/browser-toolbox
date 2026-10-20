import { useState } from 'react'

import { useFocusTarget } from '@/shared/hooks/useFocusTarget'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import {
  generatePasswords,
  DEFAULT_PASSWORD_OPTIONS,
  type PasswordOptions,
} from '@/core/engines/password'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Switch } from '@/shared/components/ui/switch'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { ToolActions } from '@/tools/text/_shared'
import { useSecurityTool } from '../_shared'

const OPTION_KEYS: {
  key: 'uppercase' | 'lowercase' | 'numbers' | 'symbols' | 'excludeAmbiguous'
  labelKey: string
  searchId: string
}[] = [
  { key: 'uppercase', labelKey: 'security.optUpper', searchId: 'optUpper' },
  { key: 'lowercase', labelKey: 'security.optLower', searchId: 'optLower' },
  { key: 'numbers', labelKey: 'security.optNumbers', searchId: 'optNumbers' },
  { key: 'symbols', labelKey: 'security.optSymbols', searchId: 'optSymbols' },
  { key: 'excludeAmbiguous', labelKey: 'security.optNoAmbiguous', searchId: 'optNoAmbiguous' },
]

export default function PasswordGeneratorTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.password-generator')
  useFocusTarget()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [lengthText, setLengthText] = useState(String(DEFAULT_PASSWORD_OPTIONS.length))
  const [countText, setCountText] = useState('1')
  const length = parseNumberInRange(lengthText, 4, 256)
  const count = parseNumberInRange(countText, 1, 50)
  const [output, setOutput] = useState<string[]>([])

  const generate = () => {
    if (length === null || count === null) return
    const results = generatePasswords({ ...options, length }, count)
    const first = results[0]
    if (first && !first.ok) {
      setOutput([])
      return
    }
    setOutput(results.flatMap((r) => (r.ok ? [r.value] : [])))
  }

  const noCharset = !options.uppercase && !options.lowercase && !options.numbers && !options.symbols

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs">
            {t('security.length')}
            <NumberField
              value={lengthText}
              onChange={setLengthText}
              min={4}
              max={256}
              className="w-20"
              ariaLabel={t('security.length')}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            {t('text.count')}
            <NumberField
              value={countText}
              onChange={setCountText}
              min={1}
              max={50}
              className="w-16"
              ariaLabel={t('text.count')}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {OPTION_KEYS.map(({ key, labelKey, searchId }) => (
            <label key={key} className="flex items-center gap-1.5 text-xs" data-search-id={searchId}>
              <Switch
                checked={options[key]}
                onCheckedChange={(v) => setOptions((o) => ({ ...o, [key]: v }))}
                aria-label={t(labelKey)}
              />
              {t(labelKey)}
            </label>
          ))}
        </div>
        {noCharset && <JsonErrorView message={t('security.needCharset')} />}
        <Button size="sm" className="w-fit" onClick={generate} disabled={noCharset || length === null || count === null}>
          <RefreshCwIcon /> {t('text.generate')}
        </Button>
        {output.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1 flex shrink-0 items-center justify-between">
              <span className="text-xs font-medium">{t('text.output')}</span>
              <ToolActions value={output.join('\n')} onClear={() => setOutput([])} />
            </div>
            <div className="scrollbar-styled min-h-0 flex-1 space-y-1 overflow-y-auto">
              {output.map((password, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-1 rounded border bg-muted/40 px-2 py-1"
                >
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
