import { useTranslation } from 'react-i18next'

import { DEFAULT_LOG_SIZE, MAX_LOG_SIZE, type InterceptorState } from '@/core/interceptor'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'

interface Props {
  state: InterceptorState
  patchSettings: (patch: Partial<InterceptorState['settings']>) => Promise<unknown>
}

export function SettingsTab({ state, patchSettings }: Props) {
  const { t } = useTranslation()
  const s = state.settings

  return (
    <div className="flex flex-col gap-4 text-sm">
      <label className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2">
        <div>
          <span className="font-medium">{t('interceptor.settings.enabled')}</span>
          <p className="text-xs text-muted-foreground">{t('interceptor.settings.enabledHint')}</p>
        </div>
        <Switch checked={!s.paused} onCheckedChange={(on) => void patchSettings({ paused: !on })} />
      </label>
      <label className="flex items-center justify-between gap-4">
        <div>
          <span>{t('interceptor.settings.toast')}</span>
          <p className="text-xs text-muted-foreground">{t('interceptor.settings.toastHint')}</p>
        </div>
        <Switch checked={s.showPageToast} onCheckedChange={(on) => void patchSettings({ showPageToast: on })} />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>{t('interceptor.settings.deep')}</span>
        <Switch
          checked={s.deepIntercept}
          onCheckedChange={(on) => {
            if (on) {
              void chrome.permissions
                .request({ permissions: ['debugger'] })
                .then((granted) => patchSettings({ deepIntercept: granted }))
            } else void patchSettings({ deepIntercept: false })
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">{t('interceptor.settings.deepHint')}</p>
      <label className="flex flex-col gap-1">
        <span>{t('interceptor.settings.logSize')}</span>
        <Input
          type="number"
          min={100}
          max={MAX_LOG_SIZE}
          value={s.logSize}
          onChange={(e) => {
            const n = Number(e.target.value)
            void patchSettings({ logSize: Number.isFinite(n) ? n : DEFAULT_LOG_SIZE })
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-4">
        <span>User scripts (Insert Script rules)</span>
        <Switch
          checked={s.userScriptsEnabled}
          onCheckedChange={(on) => {
            if (on) void chrome.permissions.request({ permissions: ['userScripts'] })
            void patchSettings({ userScriptsEnabled: on })
          }}
        />
      </label>
    </div>
  )
}
