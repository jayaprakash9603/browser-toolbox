import { useMemo } from 'react'
import { AudioLinesIcon, UserRoundIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { AUTO_VOICE } from './prefs'
import { groupVoices, voiceLabel } from './speechText'

function regionName(lang: string, displayLocale: string): string {
  const region = lang.replace('_', '-').split('-')[1]
  if (!region) return ''
  try {
    return new Intl.DisplayNames([displayLocale], { type: 'region' }).of(region.toUpperCase()) ?? ''
  } catch {
    return ''
  }
}

interface VoicePickerProps {
  voices: SpeechSynthesisVoice[]
  value: string
  autoVoice: SpeechSynthesisVoice | undefined
  textLang: string
  disabled?: boolean
  onChange: (voiceUri: string) => void
  onPreview: () => void
}

export function VoicePicker({ voices, value, autoVoice, textLang, disabled, onChange, onPreview }: VoicePickerProps) {
  const { t, i18n } = useTranslation()
  const displayLocale = i18n.resolvedLanguage ?? 'en'
  const groups = useMemo(
    () => groupVoices(voices, [textLang, typeof navigator === 'undefined' ? '' : navigator.language], displayLocale),
    [voices, textLang, displayLocale],
  )
  const selected = voices.some((voice) => voice.voiceURI === value) ? value : AUTO_VOICE
  const noVoices = voices.length === 0

  return (
    <div className="flex items-center gap-1.5">
      <Select value={selected} onValueChange={onChange} disabled={disabled || noVoices}>
        <SelectTrigger aria-label={t('text.readAloud.voice')} className="h-9 min-w-0 flex-1 text-[13px]">
          <span className="flex min-w-0 items-center gap-2">
            <UserRoundIcon className="text-muted-foreground" aria-hidden />
            {noVoices ? (
              <span className="truncate text-muted-foreground">{t('text.readAloud.noVoices')}</span>
            ) : (
              <SelectValue />
            )}
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          <SelectItem value={AUTO_VOICE}>
            {autoVoice
              ? t('text.readAloud.autoVoiceUsing', { name: voiceLabel(autoVoice) })
              : t('text.readAloud.autoVoice')}
          </SelectItem>
          {groups.map((group) => (
            <SelectGroup key={group.lang}>
              <SelectLabel className="sticky top-0 z-10 bg-popover">{group.label}</SelectLabel>
              {group.voices.map((voice) => {
                const region = regionName(voice.lang, displayLocale)
                return (
                  <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{voiceLabel(voice)}</span>
                      {region && <span className="shrink-0 text-muted-foreground">· {region}</span>}
                      {!voice.localService && (
                        <Badge variant="outline" className="h-4 shrink-0 px-1 text-[10px] font-medium">
                          {t('text.readAloud.online')}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t('text.readAloud.previewVoice')}
            disabled={disabled || noVoices}
            onClick={onPreview}
          >
            <AudioLinesIcon aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('text.readAloud.previewVoice')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
