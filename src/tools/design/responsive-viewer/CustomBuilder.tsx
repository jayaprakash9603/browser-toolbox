import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import {
  CUSTOM_MAX,
  CUSTOM_MIN,
  DEVICE_KINDS,
  FRAME_COLORS,
  exportDeviceProfile,
  frameStyleForKind,
  importDeviceProfile,
  isValidDimension,
  type Device,
  type DeviceKind,
  type FrameColor,
  type FrameStyle,
  type NotchStyle,
} from './devices'
import { DeviceFrame } from './frames'

const NOTCHES: NotchStyle[] = ['none', 'island', 'notch', 'punch-hole', 'pill']

export function CustomBuilder({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Device
  onSave: (device: Device) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.label ?? '')
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? '')
  const [width, setWidth] = useState(String(initial?.width ?? 390))
  const [height, setHeight] = useState(String(initial?.height ?? 844))
  const [dpr, setDpr] = useState(String(initial?.dpr ?? 2))
  const [kind, setKind] = useState<DeviceKind>(initial?.kind ?? 'phone')
  const [notch, setNotch] = useState<NotchStyle>(initial?.notch ?? 'island')
  const [color, setColor] = useState<FrameColor>(initial?.frameColor ?? 'black')
  const [touch, setTouch] = useState(initial?.touch ?? true)
  const [ua, setUa] = useState(initial?.userAgent ?? '')
  const w = Number(width)
  const h = Number(height)
  const ratio = Number(dpr)
  const valid = isValidDimension(w) && isValidDimension(h) && ratio > 0 && ratio <= 4

  const preview = useMemo<Device>(
    () => ({
      id: initial?.id ?? 'custom-preview',
      label: name.trim() || t('rv.custom.defaultName', { width: w || 0, height: h || 0 }),
      kind,
      width: isValidDimension(w) ? w : 390,
      height: isValidDimension(h) ? h : 844,
      dpr: ratio || 2,
      touch,
      userAgent: ua.trim() || undefined,
      frameStyle: frameStyleForKind(kind) as FrameStyle,
      notch,
      frameColor: color,
      custom: true,
      manufacturer: manufacturer.trim() || 'Custom',
      model: name.trim() || 'Custom',
      specStatus: 'approximate',
      statusBar: kind === 'phone' || kind === 'tablet' ? (frameStyleForKind(kind) === 'iphone' || frameStyleForKind(kind) === 'tablet-ios' ? 'ios' : 'android') : 'none',
      navBar: kind === 'phone' ? (frameStyleForKind(kind) === 'iphone' ? 'home-indicator' : 'android') : 'none',
    }),
    [color, h, initial?.id, kind, manufacturer, name, notch, ratio, t, touch, ua, w],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('rv.builder.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 @[640px]:grid-cols-[1fr_16rem]">
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!valid) return
              onSave({
                ...preview,
                id: initial?.id ?? `custom-${crypto.randomUUID().slice(0, 8)}`,
                kind,
                width: w,
                height: h,
              })
              onOpenChange(false)
            }}
          >
            <Field label={t('rv.custom.name')}>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 text-xs" maxLength={40} />
            </Field>
            <Field label={t('rv.builder.manufacturer')}>
              <Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className="h-8 text-xs" />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label={t('rv.custom.width')}>
                <Input value={width} onChange={(event) => setWidth(event.target.value)} type="number" min={CUSTOM_MIN} max={CUSTOM_MAX} className="h-8 font-mono text-xs" />
              </Field>
              <Field label={t('rv.custom.height')}>
                <Input value={height} onChange={(event) => setHeight(event.target.value)} type="number" min={CUSTOM_MIN} max={CUSTOM_MAX} className="h-8 font-mono text-xs" />
              </Field>
              <Field label="DPR">
                <Input value={dpr} onChange={(event) => setDpr(event.target.value)} type="number" min={1} max={4} step={0.25} className="h-8 font-mono text-xs" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-1">
              {DEVICE_KINDS.map((item) => (
                <Button key={item} type="button" size="xs" variant={kind === item ? 'default' : 'outline'} onClick={() => setKind(item)}>
                  {t(`rv.kind.${item}`)}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {NOTCHES.map((item) => (
                <Button key={item} type="button" size="xs" variant={notch === item ? 'default' : 'outline'} onClick={() => setNotch(item)}>
                  {item}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {FRAME_COLORS.map((item) => (
                <Button key={item} type="button" size="xs" variant={color === item ? 'default' : 'outline'} onClick={() => setColor(item)}>
                  {item}
                </Button>
              ))}
            </div>
            <Field label={t('rv.builder.ua')}>
              <Input value={ua} onChange={(event) => setUa(event.target.value)} className="h-8 font-mono text-[10px]" placeholder={t('rv.builder.uaOptional')} />
            </Field>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={touch} onChange={(event) => setTouch(event.target.checked)} />
              {t('rv.builder.touch')}
            </label>
            <p className="text-[10px] text-muted-foreground">{t('rv.custom.range', { min: CUSTOM_MIN, max: CUSTOM_MAX })}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!valid}>{t('rv.custom.save')}</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(exportDeviceProfile(preview))}
              >
                {t('rv.builder.export')}
              </Button>
              <Button type="button" variant="outline" asChild>
                <label className="cursor-pointer">
                  {t('rv.builder.import')}
                  <input
                    type="file"
                    accept="application/json"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      if (!file) return
                      const device = importDeviceProfile(await file.text())
                      if (!device) return
                      setName(device.label)
                      setManufacturer(device.manufacturer ?? '')
                      setWidth(String(device.width))
                      setHeight(String(device.height))
                      setDpr(String(device.dpr ?? 2))
                      setKind(device.kind)
                      setNotch(device.notch ?? 'none')
                      setColor(device.frameColor ?? 'black')
                      setTouch(device.touch ?? true)
                      setUa(device.userAgent ?? '')
                    }}
                  />
                </label>
              </Button>
            </div>
          </form>
          <div className="flex items-center justify-center rounded-xl bg-zinc-950 p-3">
            <div className="origin-center scale-[0.45]">
              <DeviceFrame device={preview} frame hostname="preview" rotated={false} color={color}>
                <div className="flex items-center justify-center bg-white text-[10px] text-zinc-400" style={{ width: preview.width, height: Math.min(preview.height, 720) }}>
                  {preview.width}×{preview.height}
                </div>
              </DeviceFrame>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  )
}
