import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

interface NumberFieldProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  min?: number
  max?: number
  allowDecimal?: boolean
  allowNegative?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function sanitizeNumberText(
  raw: string,
  { allowDecimal = false, allowNegative = false } = {},
): string {
  let result = ''
  let hasDot = false
  for (const char of raw) {
    if (char >= '0' && char <= '9') result += char
    else if (allowNegative && char === '-' && result.length === 0) result = '-'
    else if (allowDecimal && char === '.' && !hasDot) {
      result += '.'
      hasDot = true
    }
  }
  return result
}

export function parseNumberInRange(
  value: string,
  min?: number,
  max?: number,
): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(value)) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (min !== undefined && parsed < min) return null
  if (max !== undefined && parsed > max) return null
  return parsed
}

export function NumberField({
  value,
  onChange,
  ariaLabel,
  min,
  max,
  allowDecimal = false,
  allowNegative = false,
  disabled,
  placeholder,
  className,
}: NumberFieldProps) {
  const invalid = value.length > 0 && parseNumberInRange(value, min, max) === null
  return (
    <Input
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      onChange={(event) =>
        onChange(sanitizeNumberText(event.target.value, { allowDecimal, allowNegative }))
      }
      className={cn('tabular-nums', className)}
    />
  )
}
