import { describe, expect, it, vi } from 'vitest'

import { classifyCameraError, requestCameraStream } from '@/shared/media/requestCameraStream'

describe('requestCameraStream', () => {
  it('falls back when environment camera is over-constrained', async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Overconstrained', 'OverconstrainedError'))
      .mockResolvedValueOnce(stream)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })

    await expect(requestCameraStream()).resolves.toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('classifies permission errors', () => {
    expect(classifyCameraError(new DOMException('denied', 'NotAllowedError'))).toBe('denied')
    expect(classifyCameraError(new DOMException('missing', 'NotFoundError'))).toBe('unavailable')
  })
})