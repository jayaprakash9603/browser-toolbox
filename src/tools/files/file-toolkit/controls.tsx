import { useTranslation } from 'react-i18next'

import type { DocumentSettings } from '@/core/engines/files/document'
import { OptionField, OptionSelect, OptionSwitch } from '@/shared/components/toolkit'
import { Segmented } from '@/shared/components/ui/segmented'

export { OptionField, OptionSelect, OptionSwitch, PanelError, PanelSection } from '@/shared/components/toolkit'

const FONT_SIZES = ['9', '10', '11', '12', '14', '16'] as const
const LINE_HEIGHTS = ['1.15', '1.4', '1.6', '2'] as const

interface DocumentSettingsFormProps {
  value: DocumentSettings
  onChange: (value: DocumentSettings) => void
  /** Hide title, Markdown and line-number options for batch conversion. */
  compact?: boolean
}

export function DocumentSettingsForm({ value, onChange, compact = false }: DocumentSettingsFormProps) {
  const { t } = useTranslation()
  const set = <K extends keyof DocumentSettings>(key: K, next: DocumentSettings[K]) => onChange({ ...value, [key]: next })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5 @[520px]:grid-cols-3">
        <OptionSelect
          label={t('fs.doc.pageSize')}
          value={value.pageSize}
          onChange={(next) => set('pageSize', next)}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'US Letter' },
            { value: 'legal', label: 'US Legal' },
          ]}
        />
        <OptionField label={t('fs.doc.orientation')}>
          <Segmented
            size="sm"
            ariaLabel={t('fs.doc.orientation')}
            value={value.orientation}
            onValueChange={(next) => set('orientation', next)}
            options={[
              { value: 'portrait', label: t('fs.doc.portrait') },
              { value: 'landscape', label: t('fs.doc.landscape') },
            ]}
            className="h-8 w-full [&>button]:flex-1"
          />
        </OptionField>
        <OptionSelect
          label={t('fs.doc.margins')}
          value={value.margin}
          onChange={(next) => set('margin', next)}
          options={[
            { value: 'narrow', label: t('fs.doc.narrow') },
            { value: 'normal', label: t('fs.doc.normal') },
            { value: 'wide', label: t('fs.doc.wide') },
          ]}
        />
        <OptionSelect
          label={t('fs.doc.font')}
          value={value.font}
          onChange={(next) => set('font', next)}
          options={[
            { value: 'sans', label: t('fs.doc.sans') },
            { value: 'serif', label: t('fs.doc.serif') },
            { value: 'mono', label: t('fs.doc.mono') },
          ]}
        />
        <OptionSelect
          label={t('fs.doc.fontSize')}
          value={String(value.fontSize) as (typeof FONT_SIZES)[number]}
          onChange={(next) => set('fontSize', Number(next))}
          options={FONT_SIZES.map((size) => ({ value: size, label: `${size} pt` }))}
        />
        <OptionSelect
          label={t('fs.doc.lineHeight')}
          value={String(value.lineHeight) as (typeof LINE_HEIGHTS)[number]}
          onChange={(next) => set('lineHeight', Number(next))}
          options={LINE_HEIGHTS.map((height) => ({ value: height, label: `${height}×` }))}
        />
      </div>
      <div className="grid gap-2 @[520px]:grid-cols-2">
        <OptionSwitch label={t('fs.doc.pageNumbers')} checked={value.pageNumbers} onChange={(next) => set('pageNumbers', next)} />
        {!compact && (
          <>
            <OptionSwitch
              label={t('fs.doc.markdown')}
              hint={t('fs.doc.markdownHint')}
              checked={value.markdown}
              onChange={(next) => set('markdown', next)}
            />
            <OptionSwitch
              label={t('fs.doc.lineNumbers')}
              hint={t('fs.doc.lineNumbersHint')}
              checked={value.lineNumbers}
              disabled={value.markdown}
              onChange={(next) => set('lineNumbers', next)}
            />
          </>
        )}
      </div>
    </div>
  )
}
