import { describe, expect, it } from 'vitest'

import {
  classifyWorkerFetchError,
  sanitizeWorkerFetchInit,
  sanitizeWorkerHeaders,
} from '@/chrome/background/worker-fetch-init'

describe('sanitizeWorkerFetchInit', () => {
  it('coerces redirect: manual so Chrome service workers can fetch', () => {
    const init = sanitizeWorkerFetchInit({
      method: 'POST',
      redirect: 'manual',
      credentials: 'omit',
    })
    expect(init?.redirect).toBe('follow')
    expect(init?.method).toBe('POST')
  })

  it('drops forbidden request headers that fetch rejects in a worker', () => {
    expect(
      sanitizeWorkerHeaders({
        Accept: 'application/json',
        Origin: 'https://quickcalci.com',
        Referer: 'https://quickcalci.com/',
        'Sec-Fetch-Mode': 'no-cors',
        Host: 'quickcalci.com',
        'X-Custom': 'ok',
      }),
    ).toEqual({
      Accept: 'application/json',
      'X-Custom': 'ok',
    })
  })

  it('rewrites WorkerGlobalThis fetch TypeErrors into an actionable message', () => {
    const error = classifyWorkerFetchError(
      new TypeError("Failed to execute 'fetch' on 'WorkerGlobalThis': Incorrect redirect mode"),
      'https://quickcalci.com/cdn-cgi/rum',
    )
    expect(error.message).toMatch(/redirect/i)
  })
})
