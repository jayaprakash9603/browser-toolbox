import { useTranslation } from 'react-i18next'

import { FORMAT_LABELS, IMAGE_SAVE_FORMATS } from '@/core/imageConvert'
import { useSaveImageAsSettings } from '@/features/image/useSaveImageAsSettings'
import { ToolPage } from '@/shared/components/ToolPage'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Switch } from '@/shared/components/ui/switch'

import { useImageTool } from '../_shared'

export default function SaveImageAsTypeTool() {
  const { t } = useTranslation()
  const tool = useImageTool('image.save-as-type')
  const { state, patch, toggleFormat } = useSaveImageAsSettings()

  if (!state) return null

  return (
    <ToolPage
      tool={tool}
      actions={
        <Switch
          checked={state.enabled}
          onCheckedChange={(on) => void patch({ enabled: on })}
          aria-label={t('saveImageAs.enabled')}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium">{t('saveImageAs.howToTitle')}</h2>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t('saveImageAs.howTo1')}</li>
            <li>{t('saveImageAs.howTo2')}</li>
            <li>{t('saveImageAs.howTo3')}</li>
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">{t('saveImageAs.privacy')}</p>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">{t('saveImageAs.formatsTitle')}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {IMAGE_SAVE_FORMATS.map((format) => (
              <label key={format} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <Checkbox
                  checked={state.formats.includes(format)}
                  disabled={!state.enabled}
                  onCheckedChange={(on) => void toggleFormat(format, on === true)}
                />
                <span>{FORMAT_LABELS[format]}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t('saveImageAs.quality')}</span>
            <span className="text-xs text-muted-foreground">{Math.round(state.quality * 100)}%</span>
          </div>
          <input
            id="save-image-quality"
            type="range"
            min={10}
            max={100}
            step={5}
            disabled={!state.enabled}
            value={Math.round(state.quality * 100)}
            onChange={(e) => void patch({ quality: Number(e.target.value) / 100 })}
            className="w-full accent-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">{t('saveImageAs.qualityHint')}</p>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium">{t('saveImageAs.askFilename')}</p>
            <p className="text-xs text-muted-foreground">{t('saveImageAs.askFilenameHint')}</p>
          </div>
          <Switch
            checked={state.askFilename}
            disabled={!state.enabled}
            onCheckedChange={(on) => void patch({ askFilename: on })}
            aria-label={t('saveImageAs.askFilename')}
          />
        </section>
      </div>
    </ToolPage>
  )
}
