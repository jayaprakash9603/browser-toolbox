import { useMemo, useState } from 'react'
import { PauseIcon, PlayIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { countActiveModules, detectPosture, type ProtectionModuleId } from '@/core/security-center'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { applySecurityPosture } from '@/features/security-center/actions'
import {
  relativeTime,
  useAdblockEngine,
  useNow,
  usePauseState,
  useProtectionEngine,
  useSecurityEvents,
  useSecuritySettings,
} from '@/features/security-center/hooks'
import { CapsLabel, EmptyNote, Panel, StatusBadge } from './ui'

const MODULES: Array<{ id: ProtectionModuleId; title: string; blurb: string }> = [
  { id: 'malware', title: 'Malicious sites', blurb: 'Blocks known malware hosts from the bundled threat list.' },
  { id: 'phishing', title: 'Phishing', blurb: 'Blocks known phishing hosts. Lookalike warnings stay on the page.' },
  { id: 'redirects', title: 'Suspicious redirects', blurb: 'Records and can cancel rapid or looped navigations.' },
  { id: 'downloads', title: 'Download warnings', blurb: 'Flags risky downloads using the existing download guard.' },
  { id: 'thirdPartyScripts', title: 'Suspicious third-party scripts', blurb: 'Observes third-party script hosts against tracker and threat lists. This is not an eval sandbox.' },
  { id: 'miners', title: 'Cryptomining', blurb: 'Blocks known miner hosts from the bundled list.' },
  { id: 'popups', title: 'Pop-ups', blurb: 'Uses the ad blocker pop-up list when it is enabled.' },
  { id: 'ads', title: 'Intrusive ads', blurb: 'EasyList-backed ad blocking.' },
  { id: 'trackers', title: 'Tracking domains', blurb: 'EasyPrivacy-backed tracker blocking.' },
  { id: 'mixedContent', title: 'Mixed content', blurb: 'Warns about HTTP resources on HTTPS pages. The browser already blocks active mixed content.' },
  { id: 'httpsUpgrade', title: 'HTTPS upgrade', blurb: 'Optional upgradeScheme DNR. Certificate details stay unavailable.' },
  { id: 'executables', title: 'Dangerous file types', blurb: 'Heuristic executable and double-extension checks on downloads.' },
]

export function ProtectionTab() {
  const { t } = useTranslation()
  const { settings, patch } = useSecuritySettings()
  const { state: protection, stats, patch: patchProtection } = useProtectionEngine()
  const { state: adblock, patch: patchAdblock } = useAdblockEngine()
  const { pause, pauseAll, resume } = usePauseState()
  const { events } = useSecurityEvents()
  const now = useNow(1000)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ProtectionModuleId>('malware')

  const filtered = MODULES.filter((mod) => `${mod.title} ${mod.blurb}`.toLowerCase().includes(query.toLowerCase()))
  const selectedMod = MODULES.find((mod) => mod.id === selected)!
  const paused = Boolean(pause && pause.until > now)
  const remainingMs = paused && pause ? pause.until - now : 0
  const posture = protection && adblock && settings ? detectPosture(protection, adblock, settings) : settings?.posture
  const counts = protection && adblock ? countActiveModules(protection, adblock, settings?.httpsUpgrade ?? false) : null

  const intercepts = useMemo(() => {
    const recent = (stats?.recent ?? [])
      .filter((entry) => moduleMatchesCategory(selected, entry.category))
      .slice(0, 12)
    const related = events
      .filter((event) => event.category === 'protection' || event.type.includes(selected))
      .slice(0, 8)
    return { recent, related }
  }, [events, selected, stats])

  const enabled = (id: ProtectionModuleId): boolean => {
    if (!protection || !adblock) return false
    if (id === 'malware') return protection.enabled && protection.malware
    if (id === 'phishing') return protection.enabled && protection.phishing
    if (id === 'miners') return protection.enabled && protection.miners
    if (id === 'redirects') return protection.redirectProtection.enabled
    if (id === 'downloads' || id === 'executables') return protection.downloadGuard
    if (id === 'popups') return adblock.blockPopups
    if (id === 'ads') return adblock.lists.ads
    if (id === 'trackers') return adblock.lists.privacy
    if (id === 'httpsUpgrade') return settings?.httpsUpgrade ?? false
    if (id === 'mixedContent') return settings?.mixedContentWarnings ?? true
    return protection.enabled
  }

  const toggleModule = async (id: ProtectionModuleId, on: boolean) => {
    if (!protection || !adblock) return
    if (id === 'malware') await patchProtection({ malware: on })
    if (id === 'phishing') await patchProtection({ phishing: on })
    if (id === 'miners') await patchProtection({ miners: on })
    if (id === 'redirects') await patchProtection({ redirectProtection: { ...protection.redirectProtection, enabled: on } })
    if (id === 'downloads' || id === 'executables') await patchProtection({ downloadGuard: on })
    if (id === 'popups') await patchAdblock({ blockPopups: on })
    if (id === 'ads') await patchAdblock({ lists: { ...adblock.lists, ads: on } })
    if (id === 'trackers') await patchAdblock({ lists: { ...adblock.lists, privacy: on } })
    if (id === 'httpsUpgrade') await patch({ httpsUpgrade: on })
    if (id === 'mixedContent') await patch({ mixedContentWarnings: on })
  }

  return (
    <div className="@container flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <Panel className="flex flex-wrap items-center gap-2">
        <CapsLabel>{t('securityCenter.posture', 'Shield posture')}</CapsLabel>
        {(['balanced', 'strict'] as const).map((id) => (
          <Button key={id} size="sm" variant={posture === id ? 'secondary' : 'outline'} onClick={() => void applySecurityPosture(id)}>
            {id === 'balanced' ? t('securityCenter.balanced', 'Balanced') : t('securityCenter.strict', 'Strict lock')}
          </Button>
        ))}
        <StatusBadge label={posture ?? '—'} tone="info" />
        {counts ? <StatusBadge label={`${counts.active}/${counts.total} modules`} tone="muted" /> : null}
        <div className="relative min-w-[10rem] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 pl-7" placeholder={t('securityCenter.searchModules', 'Filter modules…')} />
        </div>
        {paused ? (
          <Button size="sm" onClick={() => void resume()}>
            <PlayIcon className="size-3.5" /> {t('securityCenter.resume', 'Resume shields')}
            {remainingMs ? ` (${Math.ceil(remainingMs / 1000)}s)` : ''}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void pauseAll()}>
            <PauseIcon className="size-3.5" /> {t('securityCenter.pauseAll', 'Pause all (5m)')}
          </Button>
        )}
      </Panel>

      <Panel className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          {paused
            ? 'Protection and ad blocking are paused. They restore automatically or when you resume.'
            : 'Live shields use the existing protection and ad-block engines. No second filter stack.'}
        </p>
        <StatusBadge
          label={paused ? 'Paused' : protection?.enabled ? 'Active' : 'Off'}
          tone={paused ? 'warning' : protection?.enabled ? 'success' : 'muted'}
          pulse={!paused && Boolean(protection?.enabled)}
        />
      </Panel>

      <div className="grid min-h-0 flex-1 gap-3 @lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
        <div className="grid content-start gap-2 sm:grid-cols-2">
          {filtered.map((mod) => (
            <div
              key={mod.id}
              className={`rounded-xl border bg-card p-3 text-left shadow-sm ${selected === mod.id ? 'ring-1 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(mod.id)}>
                  <p className="text-sm font-medium">{mod.title}</p>
                </button>
                <Switch
                  checked={enabled(mod.id)}
                  onCheckedChange={(on) => void toggleModule(mod.id, on)}
                  aria-label={`${mod.title} module`}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{mod.blurb}</p>
            </div>
          ))}
        </div>
        <Panel className="space-y-2">
          <CapsLabel>Inspector · {selectedMod.title}</CapsLabel>
          <p className="text-xs text-muted-foreground">{selectedMod.blurb}</p>
          <ul className="space-y-1.5">
            {intercepts.recent.map((entry, index) => (
              <li key={`${entry.host}-${entry.at}-${index}`} className="rounded-md bg-muted/60 px-2 py-1.5">
                <p className="truncate text-xs font-medium">{entry.host}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {entry.category} · {relativeTime(entry.at)}
                </p>
              </li>
            ))}
            {intercepts.related.map((event) => (
              <li key={event.id} className="rounded-md bg-muted/60 px-2 py-1.5">
                <p className="truncate text-xs font-medium">{event.description}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{relativeTime(event.timestamp)}</p>
              </li>
            ))}
            {intercepts.recent.length === 0 && intercepts.related.length === 0 ? (
              <EmptyNote>No recorded intercepts for this module.</EmptyNote>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function moduleMatchesCategory(id: ProtectionModuleId, category: string): boolean {
  if (id === 'malware') return category === 'malware'
  if (id === 'phishing') return category === 'phishing'
  if (id === 'miners') return category === 'miner'
  if (id === 'downloads' || id === 'executables') return category === 'download'
  if (id === 'redirects') return category === 'redirect'
  return false
}
