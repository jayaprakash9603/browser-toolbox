import { describe, expect, it } from 'vitest'

import {
  annotationDraftLineWidth,
  isCommittedAnnotationDrag,
  isDragAnnotationTool,
} from '@/core/engines/capture'

describe('annotation drag preview', () => {
  it('treats shape tools as drags and text or markers as clicks', () => {
    expect(isDragAnnotationTool('rect')).toBe(true)
    expect(isDragAnnotationTool('arrow')).toBe(true)
    expect(isDragAnnotationTool('text')).toBe(false)
    expect(isDragAnnotationTool('marker')).toBe(false)
  })

  it('ignores tiny pointer jitter before committing', () => {
    expect(isCommittedAnnotationDrag({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false)
    expect(isCommittedAnnotationDrag({ x: 10, y: 10 }, { x: 40, y: 24 })).toBe(true)
  })

  it('keeps the rubber-band stroke visible when zoomed out', () => {
    expect(annotationDraftLineWidth(1)).toBe(2.5)
    expect(annotationDraftLineWidth(0.03)).toBeCloseTo(2 / 0.03)
  })
})
