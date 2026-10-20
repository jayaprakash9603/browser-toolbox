import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

function isObj(v: unknown): v is Record<string, unknown> | unknown[] {
  return typeof v === 'object' && v !== null
}

function Node({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
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
      <div className="pl-4 font-mono text-[11px] break-all">
        {name && <span className="text-red-600 dark:text-red-400">{name}: </span>}
        <span className={typeof value === 'string' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600'}>
          {typeof value === 'string' ? JSON.stringify(value) : String(value)}
        </span>
      </div>
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
        <div className="pl-3">
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function JsonTree({ value }: { value: unknown }) {
  return <Node value={value} depth={0} />
}
