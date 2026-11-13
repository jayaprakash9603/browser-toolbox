import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/shared/utils/cn'

function isObj(v: unknown): v is Record<string, unknown> | unknown[] {
  return typeof v === 'object' && v !== null
}

function matchesSearch(name: string | undefined, value: unknown, search: string): boolean {
  if (!search) return true
  const q = search.toLowerCase()
  if (name?.toLowerCase().includes(q)) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase().includes(q)
  }
  if (isObj(value)) return Object.entries(value).some(([k, v]) => matchesSearch(k, v, search))
  return false
}

function Node({
  name,
  value,
  depth,
  search,
}: {
  name?: string
  value: unknown
  depth: number
  search: string
}) {
  const [open, setOpen] = useState(depth < 1)
  if (search && !matchesSearch(name, value, search)) return null
  if (typeof value === 'function') {
    return (
      <div className="pl-4 font-mono text-[11px]">
        {name && <span className="text-red-600 dark:text-red-400">{name}: </span>}
        <span className="text-muted-foreground">ƒ()</span>
      </div>
    )
  }
  if (!isObj(value)) {
    return (
      <button
        type="button"
        className="block w-full pl-4 text-left font-mono text-[11px] break-all hover:bg-muted/60"
        onClick={() => void navigator.clipboard.writeText(typeof value === 'string' ? value : String(value))}
        title="Copy value"
      >
        {name && <span className="text-red-600 dark:text-red-400">{name}: </span>}
        <span className={typeof value === 'string' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}>
          {typeof value === 'string' ? JSON.stringify(value) : String(value)}
        </span>
      </button>
    )
  }
  const isArr = Array.isArray(value)
  const entries = Object.entries(value)
  return (
    <div className="font-mono text-[11px]">
      <button type="button" className="flex items-center gap-0.5 hover:bg-muted" onClick={() => setOpen(!open)}>
        {open ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
        {name && <span className="text-red-600 dark:text-red-400">{name}: </span>}
        <span className="text-muted-foreground">{isArr ? `(${entries.length}) [ ]` : `{${entries.length ? '…' : ''}}`}</span>
      </button>
      {open && (
        <div className={cn('pl-3', depth > 12 && 'opacity-80')}>
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} search={search} />
          ))}
        </div>
      )}
    </div>
  )
}

export function JsonTree({ value, search = '' }: { value: unknown; search?: string }) {
  return <Node value={value} depth={0} search={search} />
}
