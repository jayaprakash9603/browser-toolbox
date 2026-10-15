import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon, ShieldAlertIcon } from 'lucide-react'

import { decodeJwt } from '@/core/engines/jwt'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useSecurityTool } from '../_shared'

const EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const STATUS_STYLE: Record<string, string> = {
  valid: 'border-green-500/40 text-green-700 dark:text-green-400',
  expired: 'border-red-500/40 text-red-700 dark:text-red-400',
  'not-yet-valid': 'border-amber-500/40 text-amber-700 dark:text-amber-400',
  'no-expiry': 'border-muted-foreground/40 text-muted-foreground',
}

export default function JwtToolkitTool() {
  const { t } = useTranslation()
  const tool = useSecurityTool('security.jwt-toolkit')
  const [input, setInput] = useState('')

  const decoded = useMemo(() => (input.trim() ? decodeJwt(input) : null), [input])

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('security.jwtPlaceholder')}
          ariaLabel={t('security.jwtInput')}
          minRows={4}
        />
        <div className="flex gap-1.5">
          <Button variant="link" size="xs" onClick={() => setInput(EXAMPLE)} className="px-0">
            {t('dev.tryExample')}
          </Button>
        </div>
        {decoded && !decoded.ok && <JsonErrorView message={decoded.error} />}
        {decoded?.ok && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={STATUS_STYLE[decoded.value.status]}>
                {t(`security.jwtStatus.${decoded.value.status}`)}
              </Badge>
              {typeof decoded.value.header.alg === 'string' && (
                <Badge variant="outline">{decoded.value.header.alg}</Badge>
              )}
            </div>
            <div className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
              <ShieldAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              {t('security.decodeNotVerify')}
            </div>
            {decoded.value.warnings.length > 0 && (
              <div className="space-y-1">
                {decoded.value.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400"
                  >
                    <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" /> {warning}
                  </p>
                ))}
              </div>
            )}
            <Segment title="Header" value={decoded.value.header} />
            <Segment title="Payload" value={decoded.value.payload} />
            {decoded.value.payload.exp && (
              <p className="text-[11px] text-muted-foreground">
                {t('security.expiresAt')}{' '}
                {new Date(decoded.value.payload.exp * 1000).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  )
}

function Segment({ title, value }: { title: string; value: Record<string, unknown> }) {
  const json = JSON.stringify(value, null, 2)
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium">{title}</span>
        <CopyButton text={json} />
      </div>
      <pre className="scrollbar-both min-h-0 flex-1 overflow-auto font-mono text-xs leading-relaxed text-muted-foreground">
        {json}
      </pre>
    </div>
  )
}
