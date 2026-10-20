import { LoaderCircleIcon, MonitorIcon, PlayIcon, RadarIcon, Volume2Icon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsGroup, SettingsRow } from '@/app/pages/settings/ui'
import {
  NETMON_INTERVALS,
  PING_PRESETS,
  PROBE_TIMEOUT_MS,
  SOUND_OPTIONS,
  type NetIntervalSec,
  type NetMonitorSettings,
  type NetMonitorSettingsPatch,
  type NetSoundId,
  type NetToolbarIcon,
} from '@/core/netmon'
import { playNetSound } from '@/core/netmon/sounds'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'

const CUSTOM = '__custom__'

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol)
  } catch {
    return false
  }
}

async function testUrl(url: string): Promise<number | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const started = performance.now()
  try {
    const u = new URL(url)
    u.searchParams.set('_tbx', Date.now().toString(36))
    await fetch(u, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: controller.signal })
    return Math.round(performance.now() - started)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

type Props = {
  settings: NetMonitorSettings
  patch: (next: NetMonitorSettingsPatch) => Promise<void>
}

export function SettingsTab({ settings, patch }: Props) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <SettingsGroup icon={RadarIcon} title={t('netmon.settings.checking')}>
        <SettingsRow label={t('netmon.settings.interval')} description={t('netmon.settings.intervalHint')} stacked>
          <Segmented
            ariaLabel={t('netmon.settings.interval')}
            value={String(settings.intervalSec)}
            onValueChange={(v) => void patch({ intervalSec: Number(v) as NetIntervalSec })}
            options={NETMON_INTERVALS.map((s) => ({ value: String(s), label: `${s} s` }))}
          />
        </SettingsRow>
        <PingUrlRow settings={settings} patch={patch} />
        <SettingsRow label={t('netmon.settings.showIp')} description={t('netmon.settings.showIpHint')}>
          <Switch
            checked={settings.showIp}
            onCheckedChange={(on) => void patch({ showIp: on })}
            aria-label={t('netmon.settings.showIp')}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup icon={Volume2Icon} title={t('netmon.settings.sounds')}>
        <SoundRow
          label={t('netmon.settings.soundOnline')}
          value={settings.soundOnline}
          volume={settings.volume}
          onChange={(sound) => void patch({ soundOnline: sound })}
        />
        <SoundRow
          label={t('netmon.settings.soundOffline')}
          value={settings.soundOffline}
          volume={settings.volume}
          onChange={(sound) => void patch({ soundOffline: sound })}
        />
        <VolumeRow settings={settings} patch={patch} />
      </SettingsGroup>

      <SettingsGroup icon={MonitorIcon} title={t('netmon.settings.display')}>
        <SettingsRow label={t('netmon.settings.headerIcon')} description={t('netmon.settings.headerIconHint')}>
          <Switch
            checked={settings.showHeaderIcon}
            onCheckedChange={(on) => void patch({ showHeaderIcon: on })}
            aria-label={t('netmon.settings.headerIcon')}
          />
        </SettingsRow>
        <SettingsRow label={t('netmon.settings.toolbarIcon')} description={t('netmon.settings.toolbarIconHint')} stacked>
          <Segmented
            ariaLabel={t('netmon.settings.toolbarIcon')}
            value={settings.toolbarIcon}
            onValueChange={(v) => void patch({ toolbarIcon: v as NetToolbarIcon })}
            options={[
              { value: 'off', label: t('netmon.settings.toolbarOff') },
              { value: 'dot', label: t('netmon.settings.toolbarDot') },
            ]}
          />
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}

function PingUrlRow({ settings, patch }: Props) {
  const { t } = useTranslation()
  const isPreset = PING_PRESETS.some((p) => p.url === settings.pingUrl)
  const [custom, setCustom] = useState(!isPreset)
  const [draft, setDraft] = useState(isPreset ? '' : settings.pingUrl)
  const [test, setTest] = useState<{ state: 'idle' | 'running' } | { state: 'done'; ms: number | null }>({ state: 'idle' })
  const draftValid = isHttpUrl(draft)
  const target = custom ? draft : settings.pingUrl

  return (
    <SettingsRow label={t('netmon.settings.pingUrl')} description={t('netmon.settings.pingUrlHint')} stacked>
      <div className="flex flex-col gap-2">
        <Select
          value={custom ? CUSTOM : settings.pingUrl}
          onValueChange={(value) => {
            setTest({ state: 'idle' })
            if (value === CUSTOM) {
              setCustom(true)
              return
            }
            setCustom(false)
            void patch({ pingUrl: value })
          }}
        >
          <SelectTrigger className="w-full" aria-label={t('netmon.settings.pingUrl')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PING_PRESETS.map((p) => (
              <SelectItem key={p.url} value={p.url}>
                {p.label} · <span className="text-muted-foreground">{new URL(p.url).host}</span>
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM}>{t('netmon.settings.custom')}</SelectItem>
          </SelectContent>
        </Select>
        {custom && (
          <form
            className="flex items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (draftValid) void patch({ pingUrl: draft.trim() })
            }}
          >
            <div className="min-w-0 flex-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="https://example.com/favicon.ico"
                aria-label={t('netmon.settings.pingUrl')}
                aria-invalid={draft.length > 0 && !draftValid}
                spellCheck={false}
              />
              {draft.length > 0 && !draftValid && (
                <p className="mt-1 text-[11px] text-destructive">{t('netmon.settings.invalidUrl')}</p>
              )}
            </div>
            <Button type="submit" size="sm" disabled={!draftValid || draft.trim() === settings.pingUrl}>
              {t('netmon.settings.save')}
            </Button>
          </form>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            disabled={!isHttpUrl(target) || test.state === 'running'}
            onClick={async () => {
              setTest({ state: 'running' })
              setTest({ state: 'done', ms: await testUrl(target) })
            }}
          >
            {test.state === 'running' && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            {t('netmon.settings.test')}
          </Button>
          <span role="status" className="text-xs">
            {test.state === 'done' &&
              (test.ms === null ? (
                <span className="text-destructive">{t('netmon.settings.testFail')}</span>
              ) : (
                <span style={{ color: 'var(--netmon-online)' }}>{t('netmon.settings.testOk', { ms: test.ms })}</span>
              ))}
          </span>
        </div>
      </div>
    </SettingsRow>
  )
}

function SoundRow({
  label,
  value,
  volume,
  onChange,
}: {
  label: string
  value: NetSoundId
  volume: number
  onChange: (sound: NetSoundId) => void
}) {
  const { t } = useTranslation()
  return (
    <SettingsRow label={label}>
      <div className="flex items-center gap-1.5">
        <Select
          value={value}
          onValueChange={(v) => {
            onChange(v as NetSoundId)
            void playNetSound(v as NetSoundId, volume)
          }}
        >
          <SelectTrigger size="sm" className="w-28" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOUND_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={value === 'none' || volume === 0}
          aria-label={`${t('netmon.settings.preview')}: ${label}`}
          onClick={() => void playNetSound(value, volume)}
        >
          <PlayIcon className="size-4" />
        </Button>
      </div>
    </SettingsRow>
  )
}

function VolumeRow({ settings, patch }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<number | null>(null)
  const value = draft ?? Math.round(settings.volume * 100)
  return (
    <SettingsRow label={t('netmon.settings.volume')} stacked>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={0}
          max={100}
          step={5}
          aria-label={t('netmon.settings.volume')}
          onValueChange={([v]) => setDraft(v)}
          onValueCommit={([v]) => {
            setDraft(null)
            void patch({ volume: v / 100 })
            const preview = settings.soundOnline !== 'none' ? settings.soundOnline : settings.soundOffline
            void playNetSound(preview, v / 100)
          }}
        />
        <span className="w-10 text-right font-mono text-xs tabular-nums">{value}%</span>
      </div>
    </SettingsRow>
  )
}
