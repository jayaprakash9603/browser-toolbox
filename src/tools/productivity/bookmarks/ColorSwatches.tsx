import { COLLECTION_COLOR_CLASS, COLLECTION_COLORS, type CollectionColor } from '@/core/bookmarks'
import { cn } from '@/shared/utils/cn'

export function ColorSwatches({
  value,
  onChange,
}: {
  value: CollectionColor
  onChange: (color: CollectionColor) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLLECTION_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(
            'size-7 cursor-pointer rounded-full border',
            COLLECTION_COLOR_CLASS[color],
            value === color ? 'ring-2 ring-ring' : 'border-border',
          )}
        />
      ))}
    </div>
  )
}
