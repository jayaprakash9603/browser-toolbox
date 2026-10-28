import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeftIcon, CheckIcon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { applyFilenameTemplate, formatDateParts } from '@/core/screenshot/filename'
import {
  DEFAULT_SCREENSHOT_SETTINGS,
  loadScreenshotSettings,
  saveScreenshotSettings,
  type ScreenshotSettings,
} from '@/core/screenshot/settings'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Separator } from '@/shared/components/ui/separator'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'

export const IMAGE_FORMATS: { value: ScreenshotSettings['defaultFormat']; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
  { value: 'gif', label: 'GIF' },
  { value: 'bmp', label: 'BMP' },
  { value: 'pdf', label: 'PDF' },
]

function Row({
  id,
  label,
  description,
  children,
}: {
  id: string
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="sm:w-64 sm:shrink-0">{children}</div>
    </div>
  )
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function NumberInput({
  id,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
        }}
      />
      <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
    </div>
  )
}

export function ScreenshotOptions() {
  const { navigate } = useRouter()
  const [settings, setSettings] = useState<ScreenshotSettings>(DEFAULT_SCREENSHOT_SETTINGS)
  const [saved, setSaved] = useState<ScreenshotSettings | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    void loadScreenshotSettings().then((loaded) => {
      setSettings(loaded)
      setSaved(loaded)
    })
  }, [])

  const patch = (next: Partial<ScreenshotSettings>) => {
    setJustSaved(false)
    setSettings((current) => ({ ...current, ...next }))
  }

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(settings)
  const { date, time } = formatDateParts()
  const filenamePreview = applyFilenameTemplate(settings.filenameTemplate || 'screenshot.{ext}', {
    title: 'Example page',
    date,
    time,
    domain: 'example.com',
    ext: settings.defaultFormat === 'jpeg' ? 'jpg' : settings.defaultFormat,
  })

  const save = async () => {
    const next = await saveScreenshotSettings(settings)
    setSaved(next)
    setJustSaved(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to capture"
              onClick={() => navigate('/tools/screenshots/capture')}
            >
              <ArrowLeftIcon />
            </Button>
            <h1 className="text-xl font-semibold">Screenshot options</h1>
          </div>
          <div className="flex items-center gap-2">
            {justSaved && !dirty && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckIcon className="size-3.5" /> Saved
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => patch({ ...DEFAULT_SCREENSHOT_SETTINGS })}
            >
              Reset to defaults
            </Button>
            <Button disabled={!dirty} onClick={() => void save()}>
              Save changes
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saving</CardTitle>
            <CardDescription>Format and file name used when you save a capture.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Row id="screenshot-format" label="Default format">
              <Select
                value={settings.defaultFormat}
                onValueChange={(value) =>
                  patch({ defaultFormat: value as ScreenshotSettings['defaultFormat'] })
                }
              >
                <SelectTrigger id="screenshot-format" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Separator />
            <Row
              id="screenshot-quality"
              label="JPEG / WebP quality"
              description={`${Math.round(settings.jpegQuality * 100)}%`}
            >
              <Slider
                id="screenshot-quality"
                min={30}
                max={100}
                step={1}
                value={[Math.round(settings.jpegQuality * 100)]}
                onValueChange={([value]) => patch({ jpegQuality: value / 100 })}
              />
            </Row>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label htmlFor="screenshot-filename">Filename template</Label>
              <Input
                id="screenshot-filename"
                className="font-mono"
                value={settings.filenameTemplate}
                onChange={(event) => patch({ filenameTemplate: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Tokens: {'{title}'} {'{domain}'} {'{date}'} {'{time}'} {'{url}'} {'{ext}'}. Preview:{' '}
                <span className="font-mono text-foreground">{filenamePreview}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>After capture</CardTitle>
            <CardDescription>What happens as soon as a capture finishes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Row id="screenshot-after" label="Then">
              <Select
                value={settings.afterCapture}
                onValueChange={(value) =>
                  patch({ afterCapture: value as ScreenshotSettings['afterCapture'] })
                }
              >
                <SelectTrigger id="screenshot-after" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Open in the editor tab</SelectItem>
                  <SelectItem value="clipboard">Open the editor and copy the image</SelectItem>
                  <SelectItem value="autosave">Save to Downloads without asking</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Separator />
            <SwitchRow
              id="screenshot-stamp"
              label="Page info stamp"
              description="Adds the page title, domain, and capture time to the image."
              checked={settings.pageInfoStamp}
              onCheckedChange={(checked) => patch({ pageInfoStamp: checked })}
            />
            {settings.pageInfoStamp && (
              <Row id="screenshot-stamp-position" label="Stamp position">
                <Select
                  value={settings.pageInfoPosition}
                  onValueChange={(value) =>
                    patch({ pageInfoPosition: value as ScreenshotSettings['pageInfoPosition'] })
                  }
                >
                  <SelectTrigger id="screenshot-stamp-position" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">Header</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capturing</CardTitle>
            <CardDescription>How entire-page, all-tabs, and URL list captures behave.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SwitchRow
              id="screenshot-sticky"
              label="Hide sticky headers"
              description="Hides fixed and sticky elements after the first screen so they don't repeat."
              checked={settings.hideStickyHeaders}
              onCheckedChange={(checked) => patch({ hideStickyHeaders: checked })}
            />
            <Separator />
            <Row
              id="screenshot-scroll-delay"
              label="Delay between scroll steps"
              description="Raise this for pages that load images as you scroll."
            >
              <NumberInput
                id="screenshot-scroll-delay"
                value={settings.scrollStepDelayMs}
                min={0}
                max={5000}
                step={50}
                suffix="ms"
                onChange={(value) => patch({ scrollStepDelayMs: value })}
              />
            </Row>
            <Separator />
            <Row id="screenshot-all-tabs" label="All tabs captures">
              <Select
                value={settings.allTabsMode}
                onValueChange={(value) =>
                  patch({ allTabsMode: value as ScreenshotSettings['allTabsMode'] })
                }
              >
                <SelectTrigger id="screenshot-all-tabs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entire">Entire page of each tab</SelectItem>
                  <SelectItem value="visible">Visible part of each tab</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Separator />
            <Row
              id="screenshot-batch-delay"
              label="Wait after each URL loads"
              description="Used by the list of URLs capture."
            >
              <NumberInput
                id="screenshot-batch-delay"
                value={settings.batchUrlDelayMs}
                min={0}
                max={30000}
                step={250}
                suffix="ms"
                onChange={(value) => patch({ batchUrlDelayMs: value })}
              />
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
