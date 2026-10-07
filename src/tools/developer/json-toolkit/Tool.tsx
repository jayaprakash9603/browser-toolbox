import { useMemo, useState } from 'react'
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
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = '{\n  "name": "Ada",\n  "tags": ["dev", "qa"],\n  "active": true\n}'

type JsonTab = 'format' | 'validate' | 'tree' | 'path' | 'convert'

export default function JsonToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.json-toolkit')
  const [tab, setTab] = useState<JsonTab>('format')
  const [input, setInput] = useState('')
  const [pathQuery, setPathQuery] = useState('$')
  const [convertTarget, setConvertTarget] = useState<'csv' | 'xml' | 'ts' | 'markdown'>('csv')

  const parsed = useMemo(() => parseJson(input), [input])
  const valid = parsed.ok
  const error = parsed.ok ? null : parsed.error

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

  const formatted = useMemo(() => (valid ? formatJson(input) : null), [valid, input])
  const minified = useMemo(() => (valid ? minifyJson(input) : null), [valid, input])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as JsonTab)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="tree">{t('dev.tabTree')}</TabsTrigger>
            <TabsTrigger value="path">{t('dev.tabPath')}</TabsTrigger>
            <TabsTrigger value="convert">{t('dev.tabConvert')}</TabsTrigger>
          </TabsList>

        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('dev.jsonPlaceholder')}
          ariaLabel={t('dev.jsonInput')}
          minRows={6}
        />
        {!valid && error && (
          <JsonErrorView
            message={error.message}
            line={error.line}
            column={error.column}
            suggestion={error.suggestion}
          />
        )}

        <TabsContent value="format" className="mt-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => formatted?.ok && setInput(formatted.value)}
              >
                {t('text.beautify')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!valid}
                onClick={() => minified?.ok && setInput(minified.value)}
              >
                {t('text.minify')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput(EXAMPLE)}>
                {t('dev.tryExample')}
              </Button>
            </div>
            {valid && <Badge variant="outline">{t('dev.jsonValid')}</Badge>}
          </div>
        </TabsContent>

        <TabsContent value="validate" className="mt-0">
          {valid ? (
            <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">
              {t('dev.jsonValidDetail')}
            </div>
          ) : (
            error && (
              <JsonErrorView
                message={error.message}
                line={error.line}
                column={error.column}
                suggestion={error.suggestion}
              />
            )
          )}
        </TabsContent>

        <TabsContent value="tree" className="mt-0">
          {tree ? (
            <TreeNode node={tree} depth={0} />
          ) : (
            <p className="text-xs text-muted-foreground">{t('dev.pasteValidJson')}</p>
          )}
        </TabsContent>

        <TabsContent value="path" className="mt-0">
          <div className="flex flex-col gap-2">
            <Input
              value={pathQuery}
              onChange={(e) => setPathQuery(e.target.value)}
              placeholder="$.user.name"
              aria-label={t('dev.jsonPath')}
              className="font-mono"
            />
            {pathResult &&
              (pathResult.ok ? (
                <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-2 font-mono text-[11px]">
                  {JSON.stringify(pathResult.value, null, 2)}
                </pre>
              ) : (
                <JsonErrorView
                  message={pathResult.error.message}
                  suggestion={pathResult.error.suggestion}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="convert" className="mt-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              {(['csv', 'xml', 'ts', 'markdown'] as const).map((target) => (
                <Button
                  key={target}
                  size="sm"
                  variant={convertTarget === target ? 'secondary' : 'outline'}
                  onClick={() => setConvertTarget(target)}
                >
                  {t(`dev.convert.${target}`)}
                </Button>
              ))}
            </div>
            {converted &&
              (converted.ok ? (
                <OutputPane value={converted.value} error={null} onClear={() => setInput('')} />
              ) : (
                <JsonErrorView
                  message={converted.error.message}
                  suggestion={converted.error.suggestion}
                />
              ))}
          </div>
        </TabsContent>
        </Tabs>
      </div>
    </ToolPage>
  )
}

function TreeNode({ node, depth }: { node: JsonTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2)
  const indent = { paddingLeft: `${depth * 12}px` }
  if (node.type === 'object' || node.type === 'array') {
    return (
      <div className="font-mono text-[11px]">
        <button
          type="button"
          style={indent}
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-accent"
        >
          <span className="text-muted-foreground">{open ? '▾' : '▸'}</span>
          <span className="text-primary">{node.key ?? 'root'}</span>
          <span className="text-muted-foreground">
            {node.type === 'array' ? `[${node.size}]` : `{${node.size}}`}
          </span>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
      </div>
    )
  }
  return (
    <div style={indent} className="flex gap-1 font-mono text-[11px]">
      <span className="text-primary">{node.key}:</span>
      <span className="text-muted-foreground">
        {node.type === 'string' ? `"${node.value}"` : node.value}
      </span>
    </div>
  )
}
