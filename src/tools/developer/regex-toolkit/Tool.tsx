import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from 'lucide-react'

import {
  COMMON_PATTERNS,
  DEFAULT_REGEX_FLAGS,
  replaceWithRegex,
  testRegex,
  type RegexFlags,
} from '@/core/engines/regex'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, useDevTool } from '../_shared'

const FLAG_LABELS: { key: keyof RegexFlags; label: string; title: string }[] = [
  { key: 'global', label: 'g', title: 'Global' },
  { key: 'ignoreCase', label: 'i', title: 'Ignore case' },
  { key: 'multiline', label: 'm', title: 'Multiline' },
  { key: 'dotAll', label: 's', title: 'Dot all' },
]

export default function RegexToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.regex-toolkit')
  const [tab, setTab] = useState<'test' | 'replace' | 'library'>('test')
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<RegexFlags>(DEFAULT_REGEX_FLAGS)
  const [input, setInput] = useState('')
  const [replacement, setReplacement] = useState('')

  const result = useMemo(
    () => (pattern ? testRegex(pattern, input, flags) : null),
    [pattern, input, flags],
  )
  const replaced = useMemo(
    () =>
      pattern && tab === 'replace' ? replaceWithRegex(pattern, replacement, input, flags) : null,
    [pattern, replacement, input, flags, tab],
  )

  const toggleFlag = (key: keyof RegexFlags) => setFlags((f) => ({ ...f, [key]: !f[key] }))

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="test">{t('dev.tabTest')}</TabsTrigger>
            <TabsTrigger value="replace">{t('dev.tabReplace')}</TabsTrigger>
            <TabsTrigger value="library">{t('dev.tabLibrary')}</TabsTrigger>
          </TabsList>

        {tab !== 'library' && (
          <>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <Input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder={t('dev.regexPattern')}
                aria-label={t('dev.regexPattern')}
                className="flex-1 font-mono"
              />
              <span className="text-muted-foreground">
                /{flags.global ? 'g' : ''}
                {flags.ignoreCase ? 'i' : ''}
                {flags.multiline ? 'm' : ''}
                {flags.dotAll ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {FLAG_LABELS.map(({ key, label, title }) => (
                <label key={key} className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={flags[key]}
                    onCheckedChange={() => toggleFlag(key)}
                    aria-label={title}
                  />
                  <span className="font-mono">{label}</span>
                </label>
              ))}
            </div>
            <TextEditor
              value={input}
              onChange={setInput}
              placeholder={t('dev.regexTestText')}
              ariaLabel={t('dev.regexTestText')}
              minRows={5}
            />
          </>
        )}

        <TabsContent value="test" className="mt-0">
          {result && !result.ok && <JsonErrorView message={result.error} />}
          {result?.ok && (
            <div className="flex flex-col gap-2">
              {result.riskWarnings.map((warning) => (
                <div
                  key={warning}
                  className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400"
                >
                  <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
                  {warning}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary">{t('text.matches', { count: result.totalCount })}</Badge>
                <span className="text-muted-foreground">{result.durationMs}ms</span>
                {result.truncated && (
                  <span className="text-muted-foreground">({t('dev.truncated')})</span>
                )}
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {result.matches.slice(0, 50).map((match, index) => (
                  <div
                    key={`${match.index}-${index}`}
                    className="rounded border bg-muted/40 p-1.5 font-mono text-[11px]"
                  >
                    <span className="text-primary">{match.match || '(empty)'}</span>
                    <span className="ml-2 text-muted-foreground">@{match.index}</span>
                    {match.groups.length > 0 && (
                      <div className="mt-0.5 text-muted-foreground">
                        {match.groups.map((group, gi) => (
                          <span key={gi} className="mr-2">
                            ${gi + 1}: {group ?? '—'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="replace" className="mt-0">
          <div className="flex flex-col gap-2">
            <Input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder={t('dev.replaceWith')}
              aria-label={t('dev.replaceWith')}
              className="font-mono"
            />
            {replaced && !replaced.ok && <JsonErrorView message={replaced.error} />}
            {replaced?.ok && (
              <>
                <div className="text-xs text-muted-foreground">
                  {t('text.replaced', { count: replaced.count })}
                </div>
                <pre className="max-h-56 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-[11px]">
                  {replaced.output}
                </pre>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-0">
          <div className="space-y-1.5">
            {COMMON_PATTERNS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setPattern(entry.pattern)
                  setTab('test')
                }}
                className="flex w-full flex-col gap-0.5 rounded-md border p-2 text-left transition-colors hover:bg-accent"
              >
                <span className="text-xs font-medium">{entry.label}</span>
                <code className="text-[10px] text-muted-foreground">{entry.pattern}</code>
                <span className="text-[10px] text-muted-foreground">{entry.description}</span>
              </button>
            ))}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}
