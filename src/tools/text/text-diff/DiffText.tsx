import type { InlineSegment } from '@/core/engines/diff'
import { cn } from '@/shared/utils/cn'

import { SEGMENT_TINT } from './styles'

function visibleWhitespace(text: string) {
  return text.split(/([ \t]+)/).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="text-muted-foreground/50">
        {part.replace(/ /g, '·').replace(/\t/g, '→\t')}
      </span>
    ) : (
      part
    ),
  )
}

export function PlainText({ text, showWhitespace }: { text: string; showWhitespace: boolean }) {
  return <>{showWhitespace ? visibleWhitespace(text) : text}</>
}

export function Segments({
  segments,
  showWhitespace,
  className,
}: {
  segments: InlineSegment[]
  showWhitespace: boolean
  className?: string
}) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'same' ? (
          <PlainText key={index} text={segment.text} showWhitespace={showWhitespace} />
        ) : (
          <span key={index} className={cn(SEGMENT_TINT[segment.kind], className)}>
            <PlainText text={segment.text} showWhitespace={showWhitespace} />
          </span>
        ),
      )}
    </>
  )
}
