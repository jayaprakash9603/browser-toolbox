import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'
import { generateTotp, secondsRemaining, type TotpAccount } from '@/core/security/totp'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { CopyButton } from '@/shared/components/CopyButton'
import { toolRegistry } from '@/core/registry'

function useSecurityTool(id: string) {
  const tool = toolRegistry.get(id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

export default function TotpTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.totp')
  const [accounts, setAccounts] = useState<TotpAccount[]>([])
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [remain, setRemain] = useState(secondsRemaining())

  useEffect(() => {
    void get<TotpAccount[]>(STORAGE_KEYS.totpAccounts).then((stored) => setAccounts(stored ?? []))
  }, [])

  useEffect(() => {
    const tick = () => setRemain(secondsRemaining())
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    void (async () => {
      const next: Record<string, string> = {}
      for (const acc of accounts) {
        try {
          next[acc.id] = await generateTotp(acc.secret)
        } catch {
          next[acc.id] = '------'
        }
      }
      setCodes(next)
    })()
  }, [accounts, remain])

  const add = async () => {
    if (!label.trim() || !secret.trim()) return
    const acc: TotpAccount = { id: crypto.randomUUID(), label: label.trim(), secret: secret.trim() }
    const next = [...accounts, acc]
    setAccounts(next)
    await set(STORAGE_KEYS.totpAccounts, next)
    setLabel('')
    setSecret('')
  }

  const remove = async (id: string) => {
    const next = accounts.filter((a) => a.id !== id)
    setAccounts(next)
    await set(STORAGE_KEYS.totpAccounts, next)
  }

  return (
    <ToolPage tool={tool}>
      <p className="text-xs text-muted-foreground">{t('security.totp.subtitle', { seconds: remain })}</p>
      <div className="mt-3 grid gap-2">
        <Input placeholder={t('security.totp.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input placeholder={t('security.totp.secret')} value={secret} onChange={(e) => setSecret(e.target.value)} />
        <Button size="sm" className="w-fit" onClick={() => void add()}>{t('security.totp.add')}</Button>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {accounts.map((acc) => (
          <li key={acc.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{acc.label}</p>
              <p className="font-mono text-lg tracking-widest">{codes[acc.id] ?? '······'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <CopyButton text={codes[acc.id] ?? ''} label={t('common.copy')} />
              <Button size="sm" variant="ghost" onClick={() => void remove(acc.id)}>{t('common.delete')}</Button>
            </div>
          </li>
        ))}
      </ul>
    </ToolPage>
  )
}
