import { ExternalLinkIcon, PlusIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { scriptMatchesUrl } from '@/core/script-studio'
import type { ScriptRecord, ScriptStudioSettings } from '@/core/script-studio'
import { Button } from '@/shared/components/ui/button'
import { Switch } from '@/shared/components/ui/switch'

type Props = {
  url: string | null
  scripts: ScriptRecord[]
  settings: ScriptStudioSettings
  globalEnabled: boolean
  onGlobalChange: (on: boolean) => void
  onToggle: (record: ScriptRecord, enabled: boolean) => void
  onCreate: () => void
  onOpenDashboard: () => void
  loadCode: (id: string) => Promise<string | null>
}

export function ThisPagePanel({
  url,
  scripts,
  settings,
  globalEnabled,
  onGlobalChange,
  onToggle,
  onCreate,
  onOpenDashboard,
  loadCode,
}: Props) {
  const { t } = useTranslation()
  const [matching, setMatching] = useState<ScriptRecord[]>([])

  useEffect(() => {
    if (!url) {
      setMatching([])
      return
    }
    void (async () => {
      const list: ScriptRecord[] = []
      for (const s of scripts.filter((r) => !r.trashed && r.enabled)) {
        const code = await loadCode(s.id)
        if (code && scriptMatchesUrl(s, code, url, settings)) list.push(s)
      }
      setMatching(list)
    })()
  }, [url, scripts, settings, loadCode])

  const searchLinks = useMemo(() => {
    if (!url) return []
    const q = encodeURIComponent(url)
    return [
      { label: 'Greasy Fork', href: `https://greasyfork.org/en/scripts?q=${q}` },
      { label: 'OpenUserJS', href: `https://openuserjs.org/?q=${q}` },
      { label: 'userscript.zone', href: `https://www.userscript.zone/?q=${q}` },
    ]
  }, [url])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border bg-card p-3">
        <span className="text-sm font-medium">{t('scriptStudio.globalEnabled')}</span>
        <Switch checked={globalEnabled} onCheckedChange={onGlobalChange} className="min-h-11 min-w-11" />
      </div>

      {matching.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('scriptStudio.noScripts')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matching.map((s, i) => (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">v{s.version}</p>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(on) => onToggle(s, on)} aria-label={s.name} />
            </motion.li>
          ))}
        </ul>
      )}

      {settings.scriptSearchEnabled && url ? (
        <div className="rounded-xl border p-3">
          <p className="text-xs font-medium">{t('scriptStudio.findScripts')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {searchLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1 rounded-md border px-2 text-xs hover:bg-muted"
              >
                {l.label}
                <ExternalLinkIcon className="size-3" />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="min-h-11" onClick={() => void onCreate()}>
          <PlusIcon className="size-4" />
          {t('scriptStudio.create')}
        </Button>
        <Button variant="outline" className="min-h-11" onClick={onOpenDashboard}>
          {t('scriptStudio.openDashboard')}
        </Button>
      </div>
    </div>
  )
}
