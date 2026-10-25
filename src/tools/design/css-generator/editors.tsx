import { useState, type ComponentType } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { cn } from '@/shared/utils/cn'
import { ColorField, FieldRow, Section, SelectField, SliderField, SwitchField } from './fields'
import {
  ANIMATION_DIRECTIONS,
  ANIMATION_FILLS,
  BORDER_SIDES,
  BORDER_STYLES,
  EASINGS,
  FLEX_ALIGN,
  FLEX_DIRECTIONS,
  FLEX_JUSTIFY,
  FLEX_WRAPS,
  GRID_ALIGN,
  GRID_MODES,
  TRANSFORM_ORIGINS,
  colorWithOpacity,
  gradientValue,
  newShadowLayer,
  newTextShadowLayer,
  uid,
  type AnimationState,
  type BorderState,
  type ClipPathState,
  type FilterState,
  type FlexState,
  type GlassState,
  type GradientState,
  type GridState,
  type RadiusState,
  type ShadowState,
  type TextShadowState,
  type TransformState,
} from './generators'

export interface EditorProps<S> {
  value: S
  onChange: (patch: Partial<S>) => void
}

export type Editor<S> = ComponentType<EditorProps<S>>

const MAX_LAYERS = 6
const MAX_STOPS = 6

const raw = <T extends string>(values: readonly T[]) => values.map((value) => ({ value, label: value }))

function ItemPicker({
  count,
  active,
  onSelect,
  label,
  swatches,
}: {
  count: number
  active: number
  onSelect: (index: number) => void
  label: (index: number) => string
  swatches: string[]
}) {
  return (
    <div role="group" className="flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <Button
          key={index}
          type="button"
          variant="outline"
          size="xs"
          aria-pressed={index === active}
          aria-label={label(index)}
          onClick={() => onSelect(index)}
          className={cn('gap-1.5 px-2 tabular-nums', index === active && 'border-primary bg-primary/10 text-primary hover:bg-primary/15')}
        >
          <span className="size-3 rounded-full border border-black/10 dark:border-white/15" style={{ background: swatches[index] }} />
          {index + 1}
        </Button>
      ))}
    </div>
  )
}

function ListActions({ onAdd, onRemove, canAdd, canRemove, addLabel, removeLabel }: { onAdd: () => void; onRemove: () => void; canAdd: boolean; canRemove: boolean; addLabel: string; removeLabel: string }) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="xs" onClick={onAdd} disabled={!canAdd}>
        <PlusIcon /> {addLabel}
      </Button>
      <Button type="button" variant="ghost" size="icon-xs" onClick={onRemove} disabled={!canRemove} aria-label={removeLabel}>
        <Trash2Icon />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function GradientEditor({ value, onChange }: EditorProps<GradientState>) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const active = Math.min(selected, value.stops.length - 1)
  const stop = value.stops[active]
  const updateStop = (patch: Partial<typeof stop>) =>
    onChange({ stops: value.stops.map((s, i) => (i === active ? { ...s, ...patch } : s)) })
  const addStop = () => {
    const sorted = [...value.stops].sort((a, b) => a.position - b.position)
    const index = sorted.findIndex((s) => s.id === stop.id)
    const next = sorted[index + 1] ?? sorted[index - 1]
    const position = Math.round((stop.position + (next?.position ?? 100)) / 2)
    onChange({ stops: [...value.stops, { ...stop, id: uid(), position }] })
    setSelected(value.stops.length)
  }
  const removeStop = () => onChange({ stops: value.stops.filter((_, i) => i !== active) })

  return (
    <>
      <Section title={t('css.section.type')}>
        <Segmented
          ariaLabel={t('css.field.type')}
          value={value.kind}
          onValueChange={(kind) => onChange({ kind })}
          options={[
            { value: 'linear', label: t('css.kind.linear') },
            { value: 'radial', label: t('css.kind.radial') },
            { value: 'conic', label: t('css.kind.conic') },
          ]}
          className="w-full [&>button]:flex-1"
        />
        {value.kind !== 'radial' && (
          <SliderField label={t('css.field.angle')} value={value.angle} onChange={(angle) => onChange({ angle })} min={0} max={360} unit="°" />
        )}
        {value.kind === 'radial' && (
          <FieldRow label={t('css.field.shape')}>
            <Segmented
              size="sm"
              ariaLabel={t('css.field.shape')}
              value={value.shape}
              onValueChange={(shape) => onChange({ shape })}
              options={[
                { value: 'circle', label: t('css.shape.circle') },
                { value: 'ellipse', label: t('css.shape.ellipse') },
              ]}
            />
          </FieldRow>
        )}
        {value.kind !== 'linear' && (
          <>
            <SliderField label={t('css.field.centerX')} value={value.x} onChange={(x) => onChange({ x })} min={0} max={100} unit="%" />
            <SliderField label={t('css.field.centerY')} value={value.y} onChange={(y) => onChange({ y })} min={0} max={100} unit="%" />
          </>
        )}
        <SwitchField label={t('css.field.repeating')} checked={value.repeating} onChange={(repeating) => onChange({ repeating })} />
        <SwitchField
          label={t('css.field.textGradient')}
          hint={t('css.hint.textGradient')}
          checked={value.target === 'text'}
          onChange={(text) => onChange({ target: text ? 'text' : 'background' })}
        />
      </Section>

      <Section
        title={t('css.section.stops')}
        action={
          <ListActions
            onAdd={addStop}
            onRemove={removeStop}
            canAdd={value.stops.length < MAX_STOPS}
            canRemove={value.stops.length > 2}
            addLabel={t('css.action.addStop')}
            removeLabel={t('css.action.removeStop')}
          />
        }
      >
        <div className="relative mx-2.5 h-8 rounded-md border shadow-xs" style={{ background: gradientValue({ ...value, kind: 'linear', angle: 90, repeating: false }) }}>
          {value.stops.map((s, index) => (
            <button
              key={s.id}
              type="button"
              aria-label={t('css.stopAt', { index: index + 1, position: s.position })}
              aria-pressed={index === active}
              onClick={() => setSelected(index)}
              className={cn(
                'absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white shadow-md ring-offset-1 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring',
                index === active ? 'scale-110 ring-2 ring-primary' : 'hover:scale-110',
              )}
              style={{ left: `${s.position}%`, background: s.color }}
            />
          ))}
        </div>
        <ColorField label={t('css.field.color')} value={stop.color} onChange={(color) => updateStop({ color })} />
        <SliderField label={t('css.field.position')} value={stop.position} onChange={(position) => updateStop({ position })} min={0} max={100} unit="%" />
        <SliderField label={t('css.field.opacity')} value={stop.opacity} onChange={(opacity) => updateStop({ opacity })} min={0} max={100} unit="%" />
      </Section>
    </>
  )
}

export function ShadowEditor({ value, onChange }: EditorProps<ShadowState>) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const active = Math.min(selected, value.layers.length - 1)
  const current = value.layers[active]
  const update = (patch: Partial<typeof current>) =>
    onChange({ layers: value.layers.map((l, i) => (i === active ? { ...l, ...patch } : l)) })

  return (
    <Section
      title={t('css.section.layers')}
      action={
        <ListActions
          onAdd={() => {
            onChange({ layers: [...value.layers, newShadowLayer()] })
            setSelected(value.layers.length)
          }}
          onRemove={() => onChange({ layers: value.layers.filter((_, i) => i !== active) })}
          canAdd={value.layers.length < MAX_LAYERS}
          canRemove={value.layers.length > 1}
          addLabel={t('css.action.addLayer')}
          removeLabel={t('css.action.removeLayer')}
        />
      }
    >
      <ItemPicker
        count={value.layers.length}
        active={active}
        onSelect={setSelected}
        label={(index) => t('css.layerN', { index: index + 1 })}
        swatches={value.layers.map((l) => colorWithOpacity(l.color, Math.max(l.opacity, 35)))}
      />
      <SliderField label={t('css.field.offsetX')} value={current.x} onChange={(x) => update({ x })} min={-60} max={60} unit="px" />
      <SliderField label={t('css.field.offsetY')} value={current.y} onChange={(y) => update({ y })} min={-60} max={60} unit="px" />
      <SliderField label={t('css.field.blur')} value={current.blur} onChange={(blur) => update({ blur })} min={0} max={120} unit="px" />
      <SliderField label={t('css.field.spread')} value={current.spread} onChange={(spread) => update({ spread })} min={-40} max={40} unit="px" />
      <ColorField label={t('css.field.color')} value={current.color} onChange={(color) => update({ color })} />
      <SliderField label={t('css.field.opacity')} value={current.opacity} onChange={(opacity) => update({ opacity })} min={0} max={100} unit="%" />
      <SwitchField label={t('css.field.inset')} checked={current.inset} onChange={(inset) => update({ inset })} />
    </Section>
  )
}

export function TextShadowEditor({ value, onChange }: EditorProps<TextShadowState>) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const active = Math.min(selected, value.layers.length - 1)
  const current = value.layers[active]
  const update = (patch: Partial<NonNullable<typeof current>>) =>
    onChange({ layers: value.layers.map((l, i) => (i === active ? { ...l, ...patch } : l)) })

  return (
    <>
      <Section title={t('css.section.text')}>
        <FieldRow label={t('css.field.sampleText')}>
          <Input
            value={value.text}
            maxLength={40}
            onChange={(event) => onChange({ text: event.target.value })}
            aria-label={t('css.field.sampleText')}
            className="h-8 px-2 text-xs"
          />
        </FieldRow>
        <ColorField label={t('css.field.textColor')} value={value.color} onChange={(color) => onChange({ color })} />
        <SliderField label={t('css.field.fontSize')} value={value.size} onChange={(size) => onChange({ size })} min={16} max={96} unit="px" />
        <SliderField label={t('css.field.weight')} value={value.weight} onChange={(weight) => onChange({ weight })} min={100} max={900} step={100} />
      </Section>
      <Section
        title={t('css.section.layers')}
        action={
          <ListActions
            onAdd={() => {
              onChange({ layers: [...value.layers, newTextShadowLayer()] })
              setSelected(value.layers.length)
            }}
            onRemove={() => onChange({ layers: value.layers.filter((_, i) => i !== active) })}
            canAdd={value.layers.length < MAX_LAYERS}
            canRemove={value.layers.length > 0}
            addLabel={t('css.action.addLayer')}
            removeLabel={t('css.action.removeLayer')}
          />
        }
      >
        {current ? (
          <>
            <ItemPicker
              count={value.layers.length}
              active={active}
              onSelect={setSelected}
              label={(index) => t('css.layerN', { index: index + 1 })}
              swatches={value.layers.map((l) => l.color)}
            />
            <SliderField label={t('css.field.offsetX')} value={current.x} onChange={(x) => update({ x })} min={-30} max={30} unit="px" />
            <SliderField label={t('css.field.offsetY')} value={current.y} onChange={(y) => update({ y })} min={-30} max={30} unit="px" />
            <SliderField label={t('css.field.blur')} value={current.blur} onChange={(blur) => update({ blur })} min={0} max={60} unit="px" />
            <ColorField label={t('css.field.color')} value={current.color} onChange={(color) => update({ color })} />
            <SliderField label={t('css.field.opacity')} value={current.opacity} onChange={(opacity) => update({ opacity })} min={0} max={100} unit="%" />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t('css.noLayers')}</p>
        )}
      </Section>
    </>
  )
}

export function RadiusEditor({ value, onChange }: EditorProps<RadiusState>) {
  const { t } = useTranslation()
  const max = value.unit === '%' ? 50 : 200
  const setAll = (n: number) => onChange({ tl: n, tr: n, br: n, bl: n })
  const corners = [
    ['tl', t('css.corner.tl')],
    ['tr', t('css.corner.tr')],
    ['br', t('css.corner.br')],
    ['bl', t('css.corner.bl')],
  ] as const
  return (
    <Section title={t('css.section.corners')}>
      <FieldRow label={t('css.field.unit')}>
        <Segmented
          size="sm"
          ariaLabel={t('css.field.unit')}
          value={value.unit}
          onValueChange={(unit) => {
            const limit = unit === '%' ? 50 : 200
            onChange({ unit, tl: Math.min(value.tl, limit), tr: Math.min(value.tr, limit), br: Math.min(value.br, limit), bl: Math.min(value.bl, limit) })
          }}
          options={[
            { value: 'px', label: 'px' },
            { value: '%', label: '%' },
          ]}
        />
      </FieldRow>
      <SwitchField
        label={t('css.field.linkCorners')}
        checked={value.linked}
        onChange={(linked) => (linked ? onChange({ linked, tr: value.tl, br: value.tl, bl: value.tl }) : onChange({ linked }))}
      />
      {value.linked ? (
        <SliderField label={t('css.field.radius')} value={Math.min(value.tl, max)} onChange={setAll} min={0} max={max} unit={value.unit} />
      ) : (
        corners.map(([key, label]) => (
          <SliderField key={key} label={label} value={Math.min(value[key], max)} onChange={(n) => onChange({ [key]: n })} min={0} max={max} unit={value.unit} />
        ))
      )}
    </Section>
  )
}

export function BorderEditor({ value, onChange }: EditorProps<BorderState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.border')}>
      <SliderField label={t('css.field.width')} value={value.width} onChange={(width) => onChange({ width })} min={0} max={24} unit="px" />
      <SelectField label={t('css.field.style')} value={value.style} onChange={(style) => onChange({ style })} options={raw(BORDER_STYLES)} />
      <SelectField
        label={t('css.field.sides')}
        value={value.side}
        onChange={(side) => onChange({ side })}
        options={BORDER_SIDES.map((side) => ({ value: side, label: t(`css.side.${side}`) }))}
      />
      <ColorField label={t('css.field.color')} value={value.color} onChange={(color) => onChange({ color })} />
      <SliderField label={t('css.field.opacity')} value={value.opacity} onChange={(opacity) => onChange({ opacity })} min={0} max={100} unit="%" />
      <SliderField label={t('css.field.radius')} value={value.radius} onChange={(radius) => onChange({ radius })} min={0} max={64} unit="px" />
    </Section>
  )
}

export function GlassEditor({ value, onChange }: EditorProps<GlassState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.glass')}>
      <SliderField label={t('css.field.blur')} value={value.blur} onChange={(blur) => onChange({ blur })} min={0} max={40} unit="px" />
      <SliderField label={t('css.field.saturation')} value={value.saturation} onChange={(saturation) => onChange({ saturation })} min={50} max={250} unit="%" />
      <ColorField label={t('css.field.tint')} value={value.tint} onChange={(tint) => onChange({ tint })} />
      <SliderField label={t('css.field.tintOpacity')} value={value.tintOpacity} onChange={(tintOpacity) => onChange({ tintOpacity })} min={0} max={100} unit="%" />
      <SliderField label={t('css.field.borderOpacity')} value={value.borderOpacity} onChange={(borderOpacity) => onChange({ borderOpacity })} min={0} max={100} unit="%" />
      <SliderField label={t('css.field.radius')} value={value.radius} onChange={(radius) => onChange({ radius })} min={0} max={48} unit="px" />
      <SwitchField label={t('css.field.dropShadow')} checked={value.shadow} onChange={(shadow) => onChange({ shadow })} />
    </Section>
  )
}

export function FilterEditor({ value, onChange }: EditorProps<FilterState>) {
  const { t } = useTranslation()
  const fields = [
    ['blur', 0, 20, 'px'],
    ['brightness', 0, 200, '%'],
    ['contrast', 0, 200, '%'],
    ['saturate', 0, 300, '%'],
    ['grayscale', 0, 100, '%'],
    ['sepia', 0, 100, '%'],
    ['hueRotate', 0, 360, '°'],
    ['invert', 0, 100, '%'],
    ['opacity', 0, 100, '%'],
  ] as const
  return (
    <Section title={t('css.section.adjustments')}>
      {fields.map(([key, min, max, unit]) => (
        <SliderField key={key} label={t(`css.filter.${key}`)} value={value[key]} onChange={(n) => onChange({ [key]: n })} min={min} max={max} unit={unit} />
      ))}
    </Section>
  )
}

export function TransformEditor({ value, onChange }: EditorProps<TransformState>) {
  const { t } = useTranslation()
  return (
    <>
      <Section title={t('css.section.move')}>
        <SliderField label={t('css.field.translateX')} value={value.translateX} onChange={(translateX) => onChange({ translateX })} min={-80} max={80} unit="px" />
        <SliderField label={t('css.field.translateY')} value={value.translateY} onChange={(translateY) => onChange({ translateY })} min={-80} max={80} unit="px" />
        <SliderField label={t('css.field.scale')} value={value.scale} onChange={(scale) => onChange({ scale })} min={10} max={200} unit="%" />
        <SliderField label={t('css.field.rotate')} value={value.rotate} onChange={(rotate) => onChange({ rotate })} min={-180} max={180} unit="°" />
        <SliderField label={t('css.field.skewX')} value={value.skewX} onChange={(skewX) => onChange({ skewX })} min={-45} max={45} unit="°" />
        <SliderField label={t('css.field.skewY')} value={value.skewY} onChange={(skewY) => onChange({ skewY })} min={-45} max={45} unit="°" />
      </Section>
      <Section title={t('css.section.threeD')}>
        <SliderField label={t('css.field.perspective')} value={value.perspective} onChange={(perspective) => onChange({ perspective })} min={0} max={2000} step={50} unit="px" />
        <SliderField label={t('css.field.rotateX')} value={value.rotateX} onChange={(rotateX) => onChange({ rotateX })} min={-180} max={180} unit="°" />
        <SliderField label={t('css.field.rotateY')} value={value.rotateY} onChange={(rotateY) => onChange({ rotateY })} min={-180} max={180} unit="°" />
        <SelectField label={t('css.field.origin')} value={value.origin} onChange={(origin) => onChange({ origin })} options={raw(TRANSFORM_ORIGINS)} />
      </Section>
    </>
  )
}

export function ClipPathEditor({ value, onChange }: EditorProps<ClipPathState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.shape')}>
      <p className="text-xs text-muted-foreground">{t('css.hint.clipShape', { shape: t(`css.preset.${value.shape}`) })}</p>
      {(value.shape === 'circle' || value.shape === 'ellipse') && (
        <SliderField label={t('css.field.size')} value={value.size} onChange={(size) => onChange({ size })} min={10} max={75} unit="%" />
      )}
      {value.shape === 'inset' && (
        <>
          <SliderField label={t('css.field.inset')} value={value.inset} onChange={(inset) => onChange({ inset })} min={0} max={40} unit="%" />
          <SliderField label={t('css.field.radius')} value={value.round} onChange={(round) => onChange({ round })} min={0} max={80} unit="px" />
        </>
      )}
    </Section>
  )
}

export function AnimationEditor({ value, onChange }: EditorProps<AnimationState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.timing')}>
      <SliderField label={t('css.field.duration')} value={value.duration} onChange={(duration) => onChange({ duration })} min={100} max={5000} step={50} unit="ms" />
      <SliderField label={t('css.field.delay')} value={value.delay} onChange={(delay) => onChange({ delay })} min={0} max={3000} step={50} unit="ms" />
      <SelectField
        label={t('css.field.easing')}
        value={value.easing}
        onChange={(easing) => onChange({ easing })}
        options={(Object.keys(EASINGS) as (keyof typeof EASINGS)[]).map((key) => ({ value: key, label: key }))}
      />
      <SwitchField label={t('css.field.loop')} checked={value.infinite} onChange={(infinite) => onChange({ infinite })} />
      {!value.infinite && (
        <SliderField label={t('css.field.iterations')} value={value.iterations} onChange={(iterations) => onChange({ iterations })} min={1} max={10} />
      )}
      <SelectField label={t('css.field.direction')} value={value.direction} onChange={(direction) => onChange({ direction })} options={raw(ANIMATION_DIRECTIONS)} />
      <SelectField label={t('css.field.fill')} value={value.fill} onChange={(fill) => onChange({ fill })} options={raw(ANIMATION_FILLS)} />
    </Section>
  )
}

export function FlexEditor({ value, onChange }: EditorProps<FlexState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.container')}>
      <SelectField label={t('css.field.direction')} value={value.direction} onChange={(direction) => onChange({ direction })} options={raw(FLEX_DIRECTIONS)} />
      <SelectField label={t('css.field.justify')} value={value.justify} onChange={(justify) => onChange({ justify })} options={raw(FLEX_JUSTIFY)} />
      <SelectField label={t('css.field.align')} value={value.align} onChange={(align) => onChange({ align })} options={raw(FLEX_ALIGN)} />
      <SelectField label={t('css.field.wrap')} value={value.wrap} onChange={(wrap) => onChange({ wrap })} options={raw(FLEX_WRAPS)} />
      <SliderField label={t('css.field.gap')} value={value.gap} onChange={(gap) => onChange({ gap })} min={0} max={48} unit="px" />
      <SliderField label={t('css.field.items')} value={value.items} onChange={(items) => onChange({ items })} min={1} max={10} />
    </Section>
  )
}

export function GridEditor({ value, onChange }: EditorProps<GridState>) {
  const { t } = useTranslation()
  return (
    <Section title={t('css.section.container')}>
      <SelectField
        label={t('css.field.columns')}
        value={value.mode}
        onChange={(mode) => onChange({ mode })}
        options={GRID_MODES.map((mode) => ({ value: mode, label: t(`css.gridMode.${mode}`) }))}
      />
      {value.mode === 'fixed' ? (
        <SliderField label={t('css.field.count')} value={value.columns} onChange={(columns) => onChange({ columns })} min={1} max={8} />
      ) : (
        <SliderField label={t('css.field.minWidth')} value={value.minWidth} onChange={(minWidth) => onChange({ minWidth })} min={40} max={240} step={4} unit="px" />
      )}
      <SliderField label={t('css.field.rowHeight')} value={value.rowHeight} onChange={(rowHeight) => onChange({ rowHeight })} min={0} max={160} step={4} unit="px" />
      <SliderField label={t('css.field.columnGap')} value={value.columnGap} onChange={(columnGap) => onChange({ columnGap })} min={0} max={48} unit="px" />
      <SliderField label={t('css.field.rowGap')} value={value.rowGap} onChange={(rowGap) => onChange({ rowGap })} min={0} max={48} unit="px" />
      <SelectField label={t('css.field.justifyItems')} value={value.justifyItems} onChange={(justifyItems) => onChange({ justifyItems })} options={raw(GRID_ALIGN)} />
      <SelectField label={t('css.field.alignItems')} value={value.alignItems} onChange={(alignItems) => onChange({ alignItems })} options={raw(GRID_ALIGN)} />
      <SliderField label={t('css.field.items')} value={value.items} onChange={(items) => onChange({ items })} min={1} max={16} />
    </Section>
  )
}
