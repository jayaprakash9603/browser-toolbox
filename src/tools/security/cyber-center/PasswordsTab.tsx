import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_PASSWORD_OPTIONS,
  assessPasswordStrength,
  generatePassword,
  type PasswordOptions,
} from '@/core/engines/password'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { CopyButton } from '@/shared/components/CopyButton'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { CapsLabel, Panel, StatusBadge } from './ui'

const OPTION_KEYS: Array<keyof Pick<PasswordOptions, 'uppercase' | 'lowercase' | 'numbers' | 'symbols' | 'excludeAmbiguous'>> = [
  'uppercase',
  'lowercase',
  'numbers',
  'symbols',
  'excludeAmbiguous',
]

export function PasswordsTab() {
  const { t } = useTranslation()
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [lengthText, setLengthText] = useState(String(DEFAULT_PASSWORD_OPTIONS.length))
  const [generated, setGenerated] = useState('')
  const [check, setCheck] = useState('')
  const length = parseNumberInRange(lengthText, 4, 256) ?? 16
  const generatedStrength = useMemo(() => assessPasswordStrength(generated), [generated])
  const checkStrength = useMemo(() => assessPasswordStrength(check), [check])

  const runGenerate = () => {
    const result = generatePassword({ ...options, length })
    setGenerated(result.ok ? result.value : '')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="space-y-2">
        <CapsLabel>Password generator</CapsLabel>
        <p className="text-sm text-muted-foreground">Generated with crypto.getRandomValues. Nothing is stored.</p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            Length
            <NumberField value={lengthText} onChange={setLengthText} min={4} max={256} className="w-20" ariaLabel="Length" />
          </label>
          {OPTION_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <Switch checked={options[key]} onCheckedChange={(on) => setOptions((current) => ({ ...current, [key]: on }))} />
              {key}
            </label>
          ))}
          <Button size="sm" onClick={runGenerate}>
            {t('securityCenter.generate', 'Generate')}
          </Button>
        </div>
        {generated ? (
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-sm">{generated}</code>
            <CopyButton text={generated} />
            <StatusBadge label={generatedStrength.label.replaceAll('_', ' ')} tone={strengthTone(generatedStrength.score)} />
          </div>
        ) : null}
      </Panel>
      <Panel className="space-y-2">
        <CapsLabel>Local strength check</CapsLabel>
        <Input
          value={check}
          onChange={(event) => setCheck(event.target.value)}
          placeholder="Paste a password to score locally"
          className="h-8"
          type="password"
          autoComplete="off"
        />
        <StatusBadge label={`${checkStrength.score}/100 · ${checkStrength.label.replaceAll('_', ' ')}`} tone={strengthTone(checkStrength.score)} />
        <ul className="list-disc pl-4 text-xs text-muted-foreground">
          {checkStrength.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function strengthTone(score: number): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (score >= 70) return 'success'
  if (score >= 50) return 'info'
  if (score >= 30) return 'warning'
  return 'danger'
}
