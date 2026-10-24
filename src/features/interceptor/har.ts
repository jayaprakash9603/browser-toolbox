import type { NetLogEntry } from '@/core/interceptor'

export function entriesToHar(entries: NetLogEntry[], pageTitle = 'HTTP Interceptor'): string {
  const har = {
    log: {
      version: '1.2',
      creator: { name: 'One Panel HTTP Interceptor', version: '1.0' },
      pages: [{ startedDateTime: new Date().toISOString(), id: 'page_1', title: pageTitle }],
      entries: entries.map((e) => ({
        startedDateTime: new Date(e.startedAt).toISOString(),
        time: e.durationMs ?? 0,
        request: {
          method: e.method,
          url: e.url,
          httpVersion: 'HTTP/1.1',
          headers: (e.requestHeaders ?? []).map((h: { name: string; value?: string }) => ({
        name: h.name,
        value: h.value ?? '',
      })),
          queryString: [],
          bodySize: e.requestBody?.length ?? 0,
          postData: e.requestBody
            ? { mimeType: 'text/plain', text: e.requestBody }
            : undefined,
        },
        response: {
          status: e.status ?? 0,
          statusText: '',
          httpVersion: 'HTTP/1.1',
          headers: (e.responseHeaders ?? []).map((h: { name: string; value?: string }) => ({
            name: h.name,
            value: h.value ?? '',
          })),
          content: {
            size: e.responseBody?.length ?? e.size ?? 0,
            mimeType: 'text/plain',
            text: e.responseBody ?? '',
          },
        },
        cache: {},
        timings: { send: 0, wait: e.durationMs ?? 0, receive: 0 },
      })),
    },
  }
  return JSON.stringify(har, null, 2)
}
