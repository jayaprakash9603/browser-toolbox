import { BarChart3Icon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import { Button } from '@/shared/components/ui/button'

type Props = { disabled?: boolean }

export function ChatPulsePanel({ disabled }: Props) {
  return (
    <div className="rounded-xl border bg-card p-3" data-search-id="chatPulse">
      <div className="flex items-start gap-2">
        <BarChart3Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">ChatPulse Analytics</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Open the full messaging dashboard on web.whatsapp.com (enable ChatPulse in Enhancements).
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={disabled}
            onClick={() => void sendMessage({ type: 'WA_OPEN_ANALYTICS' })}
          >
            Open ChatPulse Analytics
          </Button>
        </div>
      </div>
    </div>
  )
}
