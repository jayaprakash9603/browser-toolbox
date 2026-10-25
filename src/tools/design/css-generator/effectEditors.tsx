import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Segmented } from '@/shared/components/ui/segmented'
import type { EditorProps } from './editors'
import { ColorField, FieldRow, Section, SliderField, SwitchField } from './fields'
import {
  FIXED_MODE_STYLES,
  SIZED_BG,
  STATIC_BG,
  STATIC_TEXT,
  type BgEffectState,
  type ButtonEffectState,
  type HoverEffectState,
  type LoaderState,
  type TextEffectState,
  type UiStyleState,
} from './effects'

function ModeField({ value, onChange }: { value: 'light' | 'dark'; onChange: (mode: 'light' | 'dark') => void }) {
  const { t } = useTranslation()
  return (
    <FieldRow label={t('css.field.mode')}>
      <Segmented
        size="sm"
        ariaLabel={t('css.field.mode')}
        value={value}
        onValueChange={onChange}
        options={[
          { value: 'light', label: t('css.mode.light') },
          { value: 'dark', label: t('css.mode.dark') },
        ]}
      />
    </FieldRow>
  )
}

function TextField({ label, value, onChange, maxLength = 40 }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  const id = useId()
  return (
    <div className="grid grid-cols-[minmax(4.5rem,6.5rem)_minmax(0,1fr)] items-center gap-x-3">
      <Label htmlFor={id} className="truncate text-xs font-medium">
        {label}
      </Label>
      <Input id={id} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} className="h-8 text-xs" />
    </div>
  )
}

export function UiStyleEditor({ value, onChange }: EditorProps<UiStyleState>) {
  const { t } = useTranslation()
  const fixedMode = FIXED_MODE_STYLES.includes(value.style)
  return (
    <Section title={t('css.section.style')}>
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <p className="text-sm font-medium">{t(`css.preset.${value.style}`)}</p>
        <p className="text-xs text-muted-foreground">{t(`css.styleDesc.${value.style}`)}</p>
      </div>
      <ColorField label={t('css.field.accent')} value={value.accent} onChange={(accent) => onChange({ accent })} />
      {fixedMode ? (
        <p className="text-[11px] text-muted-foreground">{t('css.hint.fixedMode')}</p>
      ) : (
        <ModeField value={value.mode} onChange={(mode) => onChange({ mode })} />
      )}
      <SliderField label={t('css.field.radius')} value={value.radius} onChange={(radius) => onChange({ radius })} min={0} max={40} unit="px" />
      <SliderField label={t('css.field.padding')} value={value.padding} onChange={(padding) => onChange({ padding })} min={8} max={48} unit="px" />
      <SliderField label={t('css.field.intensity')} value={value.intensity} onChange={(intensity) => onChange({ intensity })} min={0} max={100} unit="%" />
    </Section>
  )
}

export function BgEffectEditor({ value, onChange }: EditorProps<BgEffectState>) {
  const { t } = useTranslation()
  const canAnimate = !STATIC_BG.includes(value.kind)
  return (
    <>
      <Section title={t('css.section.colors')}>
        <ColorField label={t('css.field.color1')} value={value.c1} onChange={(c1) => onChange({ c1 })} />
        <ColorField label={t('css.field.color2')} value={value.c2} onChange={(c2) => onChange({ c2 })} />
        <ColorField label={t('css.field.color3')} value={value.c3} onChange={(c3) => onChange({ c3 })} />
        <ColorField label={t('css.field.base')} value={value.base} onChange={(base) => onChange({ base })} />
      </Section>
      <Section title={t('css.section.effect')}>
        <SliderField label={t('css.field.intensity')} value={value.intensity} onChange={(intensity) => onChange({ intensity })} min={0} max={100} unit="%" />
        {SIZED_BG.includes(value.kind) && <SliderField label={t('css.field.size')} value={value.size} onChange={(size) => onChange({ size })} min={8} max={80} unit="px" />}
        {canAnimate && (
          <>
            <SwitchField label={t('css.field.animate')} checked={value.animate} onChange={(animate) => onChange({ animate })} hint={t('css.hint.reducedMotion')} />
            {value.animate && <SliderField label={t('css.field.speed')} value={value.speed} onChange={(speed) => onChange({ speed })} min={2} max={40} unit="s" />}
          </>
        )}
      </Section>
    </>
  )
}

export function TextEffectEditor({ value, onChange }: EditorProps<TextEffectState>) {
  const { t } = useTranslation()
  return (
    <>
      <Section title={t('css.section.text')}>
        <TextField label={t('css.field.sampleText')} value={value.text} onChange={(text) => onChange({ text })} maxLength={32} />
        <SliderField label={t('css.field.fontSize')} value={value.size} onChange={(size) => onChange({ size })} min={16} max={96} unit="px" />
        <SliderField label={t('css.field.weight')} value={value.weight} onChange={(weight) => onChange({ weight })} min={300} max={900} step={100} />
        <ColorField label={t('css.field.textColor')} value={value.ink} onChange={(ink) => onChange({ ink })} />
      </Section>
      <Section title={t('css.section.effect')}>
        <ColorField label={t('css.field.color1')} value={value.c1} onChange={(c1) => onChange({ c1 })} />
        <ColorField label={t('css.field.color2')} value={value.c2} onChange={(c2) => onChange({ c2 })} />
        {!STATIC_TEXT.includes(value.kind) && (
          <SliderField label={t('css.field.speed')} value={value.speed} onChange={(speed) => onChange({ speed })} min={1} max={12} step={0.5} unit="s" />
        )}
      </Section>
    </>
  )
}

export function ButtonEffectEditor({ value, onChange }: EditorProps<ButtonEffectState>) {
  const { t } = useTranslation()
  return (
    <>
      <Section title={t('css.section.button')}>
        <TextField label={t('css.field.label')} value={value.label} onChange={(label) => onChange({ label })} maxLength={24} />
        <SliderField label={t('css.field.fontSize')} value={value.size} onChange={(size) => onChange({ size })} min={12} max={24} unit="px" />
        <SliderField label={t('css.field.radius')} value={value.radius} onChange={(radius) => onChange({ radius })} min={0} max={40} unit="px" />
      </Section>
      <Section title={t('css.section.effect')}>
        <ColorField label={t('css.field.color1')} value={value.c1} onChange={(c1) => onChange({ c1 })} />
        <ColorField label={t('css.field.color2')} value={value.c2} onChange={(c2) => onChange({ c2 })} />
        <SliderField label={t('css.field.speed')} value={value.speed} onChange={(speed) => onChange({ speed })} min={1} max={8} step={0.5} unit="s" />
      </Section>
    </>
  )
}

export function HoverEffectEditor({ value, onChange }: EditorProps<HoverEffectState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.effect')}>
      <ColorField label={t('css.field.accent')} value={value.accent} onChange={(accent) => onChange({ accent })} />
      <ModeField value={value.mode} onChange={(mode) => onChange({ mode })} />
      <SliderField label={t('css.field.radius')} value={value.radius} onChange={(radius) => onChange({ radius })} min={0} max={32} unit="px" />
      <SliderField label={t('css.field.intensity')} value={value.intensity} onChange={(intensity) => onChange({ intensity })} min={0} max={100} unit="%" />
      <SliderField label={t('css.field.duration')} value={value.duration} onChange={(duration) => onChange({ duration })} min={100} max={1000} step={50} unit="ms" />
    </Section>
  )
}

export function LoaderEditor({ value, onChange }: EditorProps<LoaderState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.loader')}>
      <ColorField label={t('css.field.color')} value={value.c1} onChange={(c1) => onChange({ c1 })} />
      <ColorField label={t('css.field.track')} value={value.c2} onChange={(c2) => onChange({ c2 })} />
      <SliderField label={t('css.field.size')} value={value.size} onChange={(size) => onChange({ size })} min={16} max={120} unit="px" />
      <SliderField label={t('css.field.thickness')} value={value.thickness} onChange={(thickness) => onChange({ thickness })} min={2} max={12} unit="px" />
      <SliderField label={t('css.field.speed')} value={value.speed} onChange={(speed) => onChange({ speed })} min={0.3} max={3} step={0.1} unit="s" />
    </Section>
  )
}
