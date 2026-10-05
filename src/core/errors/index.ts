export class ToolboxError extends Error {
  readonly code: string
  override readonly cause?: unknown

  constructor(message: string, code: string, cause?: unknown) {
    super(message)
    this.name = 'ToolboxError'
    this.code = code
    this.cause = cause
  }
}

export function toUserMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ToolboxError) return error.message
  if (error instanceof Error && error.message) return fallback
  return fallback
}
