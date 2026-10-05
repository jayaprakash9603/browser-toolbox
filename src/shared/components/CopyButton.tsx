import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

interface CopyButtonProps {
  text: string
  size?: 'icon-xs' | 'icon-sm' | 'xs' | 'sm'
  label?: string
}

export function CopyButton({ text, size = 'icon-xs', label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()
  const buttonLabel = label ?? t('common.copy')

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          onClick={copy}
          aria-label={buttonLabel}
          disabled={!text}
        >
          {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
          {(size === 'xs' || size === 'sm') && <span>{copied ? t('common.copied') : buttonLabel}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{buttonLabel}</TooltipContent>
    </Tooltip>
  )
}
