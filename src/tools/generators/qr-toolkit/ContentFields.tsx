import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EyeIcon, EyeOffIcon, GlobeIcon } from 'lucide-react'

import type { QrPreset } from '@/core/engines/qrcode'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/utils/cn'

import { PRESET_ICONS } from './presetIcons'
import { PRESETS, type QrForm } from './qrModel'

export function PresetPicker({ value, onChange }: { value: QrPreset; onChange: (preset: QrPreset) => void }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (from: number, step: number) => {
    const next = (from + step + PRESETS.length) % PRESETS.length
    onChange(PRESETS[next])
    refs.current[next]?.focus()
  }

  return (
    <div className="@container">
      <div
        role="radiogroup"
        aria-label={t('qr.type')}
        className="grid grid-cols-3 gap-1.5 @md:grid-cols-5 @2xl:grid-cols-9"
      >
        {PRESETS.map((preset, index) => {
          const Icon = PRESET_ICONS[preset]
          const selected = preset === value
          return (
            <button
              key={preset}
              ref={(node) => {
                refs.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(preset)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  move(index, 1)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  move(index, -1)
                }
              }}
              className={cn(
                'group/preset relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border bg-card px-1 py-2 text-xs font-medium text-muted-foreground outline-none transition-[color,border-color,transform] duration-150 hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
                selected && 'border-primary/40 text-primary hover:text-primary',
              )}
            >
              {selected && (
                <motion.span
                  layoutId="qr-preset-active"
                  aria-hidden
                  className="absolute inset-0 rounded-[11px] bg-gradient-to-b from-primary/15 to-primary/[0.04]"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 36 }}
                />
              )}
              <motion.span
                className="relative"
                animate={selected && !reduce ? { scale: [1, 1.22, 1], rotate: [0, -8, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Icon className="size-4" aria-hidden />
              </motion.span>
              <span className="relative truncate">{t(`qr.preset.${preset}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="font-normal tabular-nums">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function currentTabUrl(): Promise<string | null> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return Promise.resolve(null)
  return chrome.tabs
    .query({ active: true, lastFocusedWindow: true })
    .then(([tab]) => (tab?.url && /^https?:/i.test(tab.url) ? tab.url : null))
    .catch(() => null)
}

interface ContentFieldsProps {
  preset: QrPreset
  form: QrForm
  onChange: (patch: Partial<QrForm>) => void
}

export function ContentFields({ preset, form, onChange }: ContentFieldsProps) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={preset}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: 12, filter: 'blur(3px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8, filter: 'blur(2px)', transition: { duration: 0.12 } }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        className="@container flex flex-col gap-3"
      >
        <PresetFields preset={preset} form={form} onChange={onChange} />
      </motion.div>
    </AnimatePresence>
  )
}

function PresetFields({ preset, form, onChange }: ContentFieldsProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [tabError, setTabError] = useState(false)
  const grid = 'grid grid-cols-1 gap-3 @sm:grid-cols-2'

  switch (preset) {
    case 'text':
      return (
        <Field label={t('qr.content')} hint={t('qrk.chars', { count: form.text.length })}>
          <Textarea
            rows={3}
            value={form.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={t('qr.textPlaceholder')}
          />
        </Field>
      )
    case 'url':
      return (
        <Field label={t('qrk.url')}>
          <div className="flex gap-2">
            <Input
              type="url"
              inputMode="url"
              value={form.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://example.com"
              className="font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => {
                void currentTabUrl().then((url) => {
                  setTabError(!url)
                  if (url) onChange({ url })
                })
              }}
            >
              <GlobeIcon aria-hidden />
              {t('qrk.currentTab')}
            </Button>
          </div>
          {tabError && <span className="text-xs text-muted-foreground">{t('qrk.noTabUrl')}</span>}
        </Field>
      )
    case 'wifi':
      return (
        <>
          <div className={grid}>
            <Field label={t('qrk.ssid')}>
              <Input value={form.ssid} onChange={(e) => onChange({ ssid: e.target.value })} placeholder="Home-5G" />
            </Field>
            <Field label={t('qr.password')}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  disabled={form.encryption === 'nopass'}
                  onChange={(e) => onChange({ password: e.target.value })}
                  className="pr-9 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-1 right-1"
                  aria-label={t(showPassword ? 'qrk.hidePassword' : 'qrk.showPassword')}
                  aria-pressed={showPassword}
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPassword((v) => !v)
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </div>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              ariaLabel={t('qr.encryption')}
              value={form.encryption}
              onValueChange={(encryption) => onChange({ encryption })}
              options={[
                { value: 'WPA', label: 'WPA/WPA2' },
                { value: 'WEP', label: 'WEP' },
                { value: 'nopass', label: t('qrk.openNetwork') },
              ]}
            />
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
              <Switch checked={form.hidden} onCheckedChange={(hidden) => onChange({ hidden })} />
              {t('qrk.hiddenNetwork')}
            </label>
          </div>
        </>
      )
    case 'email':
      return (
        <>
          <div className={grid}>
            <Field label={t('qr.emailTo')}>
              <Input type="email" value={form.emailTo} onChange={(e) => onChange({ emailTo: e.target.value })} placeholder="name@example.com" />
            </Field>
            <Field label={t('qr.subject')}>
              <Input value={form.emailSubject} onChange={(e) => onChange({ emailSubject: e.target.value })} />
            </Field>
          </div>
          <Field label={t('qrk.message')}>
            <Textarea rows={2} value={form.emailBody} onChange={(e) => onChange({ emailBody: e.target.value })} />
          </Field>
        </>
      )
    case 'phone':
      return (
        <Field label={t('qr.phone')}>
          <Input type="tel" value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+1 555 123 4567" />
        </Field>
      )
    case 'sms':
      return (
        <>
          <Field label={t('qr.phone')}>
            <Input type="tel" value={form.smsPhone} onChange={(e) => onChange({ smsPhone: e.target.value })} placeholder="+1 555 123 4567" />
          </Field>
          <Field label={t('qrk.message')} hint={t('qrk.chars', { count: form.smsMessage.length })}>
            <Textarea rows={2} value={form.smsMessage} onChange={(e) => onChange({ smsMessage: e.target.value })} />
          </Field>
        </>
      )
    case 'contact':
      return (
        <div className={grid}>
          <Field label={t('qr.firstName')}>
            <Input value={form.firstName} onChange={(e) => onChange({ firstName: e.target.value })} />
          </Field>
          <Field label={t('qr.lastName')}>
            <Input value={form.lastName} onChange={(e) => onChange({ lastName: e.target.value })} />
          </Field>
          <Field label={t('qr.phone')}>
            <Input type="tel" value={form.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} />
          </Field>
          <Field label={t('qrk.email')}>
            <Input type="email" value={form.contactEmail} onChange={(e) => onChange({ contactEmail: e.target.value })} />
          </Field>
          <Field label={t('qrk.organization')}>
            <Input value={form.organization} onChange={(e) => onChange({ organization: e.target.value })} />
          </Field>
          <Field label={t('qrk.website')}>
            <Input type="url" value={form.contactUrl} onChange={(e) => onChange({ contactUrl: e.target.value })} placeholder="https://" />
          </Field>
        </div>
      )
    case 'geo':
      return (
        <div className={grid}>
          <Field label={t('qrk.latitude')}>
            <Input inputMode="decimal" value={form.lat} onChange={(e) => onChange({ lat: e.target.value })} placeholder="48.8584" className="font-mono" />
          </Field>
          <Field label={t('qrk.longitude')}>
            <Input inputMode="decimal" value={form.lng} onChange={(e) => onChange({ lng: e.target.value })} placeholder="2.2945" className="font-mono" />
          </Field>
        </div>
      )
    case 'event':
      return (
        <>
          <Field label={t('qrk.eventTitle')}>
            <Input value={form.eventTitle} onChange={(e) => onChange({ eventTitle: e.target.value })} />
          </Field>
          <div className={grid}>
            <Field label={t('qrk.starts')}>
              <Input type="datetime-local" value={form.eventStart} onChange={(e) => onChange({ eventStart: e.target.value })} />
            </Field>
            <Field label={t('qrk.ends')}>
              <Input type="datetime-local" value={form.eventEnd} min={form.eventStart || undefined} onChange={(e) => onChange({ eventEnd: e.target.value })} />
            </Field>
          </div>
          <Field label={t('qrk.location')}>
            <Input value={form.eventLocation} onChange={(e) => onChange({ eventLocation: e.target.value })} />
          </Field>
        </>
      )
  }
}
