import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  buildJsonTree,
  formatJson,
  jsonToCsv,
  jsonToMarkdownTable,
  jsonToTypeScript,
  jsonToXml,
  minifyJson,
  parseJson,
  queryJsonPath,
  type JsonTreeNode,
} from '@/core/engines/json'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'
import { useDeepLinkParam, useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'
import {
  JSON_CONVERT_TARGETS,
  JSON_TABS,
  type JsonConvertTarget,
  type JsonTab,
} from './tabs'

const EXAMPLE = '{\n  "name": "Ada",\n  "tags": ["dev", "qa"],\n  "active": true\n}'

type ConvertTarget = JsonConvertTarget
type Indent = '2' | '4' | 'tab'

const CONVERT_LANGUAGE: Record<ConvertTarget, EditorLanguage> = {
  csv: 'text',
  xml: 'xml',
  ts: 'javascript',
  markdown: 'text',
}

export default function JsonToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.json-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', JSON_TABS, 'format')
  const [input, setInput] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [pathQuery, setPathQuery] = useState('$')
  const [convertTarget, setConvertTarget] = useDeepLinkParam('target', JSON_CONVERT_TARGETS, 'csv')

  useEffect(() => {
    if (tab === 'convert' && !JSON_CONVERT_TARGETS.includes(convertTarget)) {
      setConvertTarget('csv')
    }
  }, [tab, convertTarget, setConvertTarget])

  const parsed = useMemo(() => parseJson(input), [input])
  const valid = parsed.ok
  const error = parsed.ok ? null : parsed.error
  const hasInput = input.trim().length > 0

  const tree = useMemo(() => (valid ? buildJsonTree(parsed.value) : null), [valid, parsed])
  const pathResult = useMemo(
    () => (valid && pathQuery.trim() ? queryJsonPath(parsed.value, pathQuery) : null),
    [valid, parsed, pathQuery],
  )

  const converted = useMemo(() => {
    if (!valid) return null
    switch (convertTarget) {
      case 'csv':
        return jsonToCsv(parsed.value)
      case 'xml':
        return jsonToXml(parsed.value)
      case 'ts':
        return { ok: true as const, value: jsonToTypeScript(parsed.value) }
      case 'markdown':
        return jsonToMarkdownTable(parsed.value)
    }
  }, [valid, parsed, convertTarget])

  const beautify = () => {
    const result = formatJson(input, indent === 'tab' ? '\t' : Number(indent))
    if (result.ok) setInput(result.value)
  }
  const minify = () => {
    const result = minifyJson(input)
    if (result.ok) setInput(result.value)
  }

  const status = hasInput
    ? valid
      ? { tone: 'valid' as const, text: t('dev.jsonValid') }
      : { tone: 'invalid' as const, text: t('editor.invalid') }
    : null

  const rightPane = renderRightPane()

  function renderRightPane() {
    if (!valid) return null
    if (tab === 'tree' && tree) {
      return (
        <section className="scrollbar-both flex min-h-0 flex-col rounded-lg border bg-background p-2 shadow-xs">
          <TreeNode node={tree} depth={0} />
        </section>
      )
    }
    if (tab === 'path' && pathResult) {
      return pathResult.ok ? (
        <OutputPane
          value={JSON.stringify(pathResult.value, null, 2)}
          error={null}
          language="json"
          label={t('dev.jsonPath')}
          onClear={() => setPathQuery('$')}
          fill
        />
      ) : (
        <JsonErrorView message={pathResult.error.message} suggestion={pathResult.error.suggestion} />
      )
    }
    if (tab === 'convert' && converted) {
      return converted.ok ? (
        <OutputPane
          value={converted.value}
          error={null}
          language={CONVERT_LANGUAGE[convertTarget]}
          label={t(`dev.convert.${convertTarget}`)}
          onClear={() => setInput('')}
          fill
        />
      ) : (
        <JsonErrorView message={converted.error.message} suggestion={converted.error.suggestion} />
      )
    }
    return null
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab(v as JsonTab)} className="min-h-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="max-w-full justify-start">
            <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="tree">{t('dev.tabTree')}</TabsTrigger>
            <TabsTrigger value="path">{t('dev.tabPath')}</TabsTrigger>
            <TabsTrigger value="convert">{t('dev.tabConvert')}</TabsTrigger>
          </TabsList>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setInput(EXAMPLE)}>
            <SparklesIcon /> {t('dev.tryExample')}
          </Button>
        </div>

        <TabsContent value="format" className="mt-0 flex-none">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!valid} onClick={beautify}>
              {t('text.beautify')}
            </Button>
            <Button size="sm" variant="outline" disabled={!valid} onClick={minify}>
              {t('text.minify')}
            </Button>
            <span className="ml-1 text-xs text-muted-foreground">{t('editor.indent')}</span>
            <Segmented
              value={indent}
              onValueChange={setIndent}
              ariaLabel={t('editor.indent')}
              size="sm"
              options={[
                { value: '2', label: '2' },
                { value: '4', label: '4' },
                { value: 'tab', label: 'Tab' },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="validate" className="mt-0 flex-none">
          {valid ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              {t('dev.jsonValidDetail')}
            </p>
          ) : (
            !hasInput && <p className="text-xs text-muted-foreground">{t('dev.pasteValidJson')}</p>
          )}
        </TabsContent>

        <TabsContent value="tree" className="mt-0 flex-none">
          {!valid && <p className="text-xs text-muted-foreground">{t('dev.pasteValidJson')}</p>}
        </TabsContent>

        <TabsContent value="path" className="mt-0 flex-none">
          <Input
            value={pathQuery}
            onChange={(e) => setPathQuery(e.target.value)}
            placeholder="$.user.name"
            aria-label={t('dev.jsonPath')}
            className="font-mono"
          />
        </TabsContent>

        <TabsContent value="convert" className="mt-0 flex-none">
          <Segmented
            value={convertTarget}
            onValueChange={setConvertTarget}
            ariaLabel={t('dev.tabConvert')}
            options={(['csv', 'xml', 'ts', 'markdown'] as const).map((target) => ({
              value: target,
              label: t(`dev.convert.${target}`),
            }))}
          />
        </TabsContent>

        <TextPaneGrid split={Boolean(rightPane)}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('dev.jsonPlaceholder')}
            ariaLabel={t('dev.jsonInput')}
            label={t('common.input')}
            language="json"
            status={status}
            onKeyCommand={beautify}
            fill
          />
          {rightPane}
        </TextPaneGrid>

        {hasInput && !valid && error && (
          <div className="scrollbar-styled max-h-32 shrink-0">
            <JsonErrorView
              message={error.message}
              line={error.line}
              column={error.column}
              suggestion={error.suggestion}
            />
          </div>
        )}
      </Tabs>
    </ToolPage>
  )
}

function TreeNode({ node, depth }: { node: JsonTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const indent = { paddingLeft: `${depth * 14 + 4}px` }
  if (node.type === 'object' || node.type === 'array') {
    const Chevron = open ? ChevronDownIcon : ChevronRightIcon
    return (
      <div className="font-mono text-xs leading-6">
        <Button
          type="button"
          variant="ghost"
          style={indent}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="h-6 w-full justify-start gap-1 rounded px-1 font-mono text-xs font-normal active:scale-100"
        >
          <Chevron className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[color:var(--syntax-key)]">{node.key ?? 'root'}</span>
          <span className="text-muted-foreground">
            {node.type === 'array' ? `[${node.size}]` : `{${node.size}}`}
          </span>
        </Button>
        {open &&
          node.children?.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    )
  }
  return (
    <div style={{ paddingLeft: `${depth * 14 + 22}px` }} className="flex gap-1.5 font-mono text-xs leading-6">
      <span className="text-[color:var(--syntax-key)]">{node.key}:</span>
      <span
        className={
          node.type === 'string'
            ? 'text-[color:var(--syntax-string)]'
            : 'text-[color:var(--syntax-number)]'
        }
      >
        {node.type === 'string' ? `"${node.value}"` : node.value}
      </span>
    </div>
  )
}
