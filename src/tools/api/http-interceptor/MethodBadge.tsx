import { cn } from '@/shared/utils/cn'

const METHOD_CLASS: Record<string, string> = {
  GET: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  POST: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PUT: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  PATCH: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  DELETE: 'bg-red-500/10 text-red-700 dark:text-red-300',
  HEAD: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  OPTIONS: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  const key = method.toUpperCase()
  return (
    <span
      className={cn(
        'inline-flex min-w-[3.25rem] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide',
        METHOD_CLASS[key] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {key}
    </span>
  )
}

export function statusBadgeClass(status?: number): string {
  if (status == null) return 'text-muted-foreground'
  if (status >= 500) return 'text-red-600 dark:text-red-400'
  if (status >= 400) return 'text-amber-700 dark:text-amber-400'
  if (status >= 300) return 'text-sky-700 dark:text-sky-400'
  if (status >= 200) return 'text-emerald-700 dark:text-emerald-400'
  return 'text-muted-foreground'
}

export function kindBadgeClass(kind: string): string {
  if (kind === 'graphql') return 'text-violet-700 dark:text-violet-300'
  if (kind === 'json') return 'text-sky-700 dark:text-sky-300'
  if (kind === 'xml') return 'text-amber-700 dark:text-amber-300'
  return 'text-muted-foreground'
}
