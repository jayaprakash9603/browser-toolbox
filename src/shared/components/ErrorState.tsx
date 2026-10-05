import { AlertCircleIcon } from 'lucide-react'

interface ErrorStateProps {
  message: string
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
    >
      <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
