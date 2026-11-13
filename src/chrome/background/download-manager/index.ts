import { registerMessageHandler } from '@/core/messaging'
import type { ExtensionMessage } from '@/core/messaging/types'
import {
  getDownloadManagerState,
  patchDownloadManagerSettings,
} from '@/core/download-manager'
import {
  cancelDownload,
  eraseDownload,
  openDownload,
  pauseDownload,
  removeDownloadFile,
  resumeDownload,
  searchDownloads,
  showDownload,
  startDownload,
} from './control'
import { refreshLiveSnapshot, noteSpeedOnDelta } from './live'
import {
  clearQueue,
  enqueueUrls,
  kickQueue,
  onDownloadFinished,
  removeQueueItem,
  reorderQueue,
} from './queue'
import { deleteSchedule, registerDownloadScheduler, syncAllScheduleAlarms, upsertSchedule } from './scheduler'
import { notifyDownloadCompleted } from './notifications'

let eventsBound = false

function bindDownloadEvents(): void {
  if (eventsBound || !chrome.downloads) return
  eventsBound = true
  chrome.downloads.onCreated.addListener(() => {
    void refreshLiveSnapshot()
  })
  chrome.downloads.onChanged.addListener((delta) => {
    void noteSpeedOnDelta(delta)
    void refreshLiveSnapshot()
    const state = delta.state?.current
    if (state === 'complete' || state === 'interrupted') {
      void onDownloadFinished(delta.id, state === 'complete').then(() => {
        if (state === 'complete') {
          void chrome.downloads.search({ id: delta.id }).then((items) => {
            const name = items[0]?.filename?.split(/[\\/]/).pop() ?? 'File'
            void notifyDownloadCompleted(name)
          })
        }
      })
    }
  })
  chrome.downloads.onErased.addListener(() => {
    void refreshLiveSnapshot()
  })
}

export function registerDownloadManager(): void {
  bindDownloadEvents()
  registerDownloadScheduler()
  void syncAllScheduleAlarms()
  void refreshLiveSnapshot()

  registerMessageHandler('DOWNLOAD_MANAGER_GET_SNAPSHOT', async () => {
    const snapshot = await refreshLiveSnapshot()
    const state = await getDownloadManagerState()
    return { snapshot, state }
  })

  registerMessageHandler('DOWNLOAD_MANAGER_SEARCH', async (msg) => {
    const query = (msg as { query?: chrome.downloads.DownloadQuery }).query ?? {}
    const items = await searchDownloads(query)
    return items
  })

  registerMessageHandler('DOWNLOAD_MANAGER_START', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_START' }>
    const id = await startDownload({
      url: m.url,
      filename: m.filename,
      saveAs: m.saveAs,
      referrer: m.referrer,
    })
    kickQueue()
    return { downloadId: id }
  })

  registerMessageHandler('DOWNLOAD_MANAGER_CONTROL', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_CONTROL' }>
    const ids = m.ids ?? []
    for (const id of ids) {
      switch (m.action) {
        case 'pause':
          await pauseDownload(id)
          break
        case 'resume':
          await resumeDownload(id)
          break
        case 'cancel':
          await cancelDownload(id)
          break
        case 'erase':
          await eraseDownload(id)
          break
        case 'removeFile':
          await removeDownloadFile(id)
          break
        case 'show':
          await showDownload(id)
          break
        case 'open':
          await openDownload(id)
          break
        case 'retry': {
          const [item] = await chrome.downloads.search({ id })
          if (item?.url) {
            await startDownload({ url: item.finalUrl || item.url, referrer: item.referrer })
          }
          break
        }
      }
    }
    await refreshLiveSnapshot()
    return { ok: true }
  })

  registerMessageHandler('DOWNLOAD_MANAGER_PATCH_SETTINGS', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_PATCH_SETTINGS' }>
    const settings = await patchDownloadManagerSettings(m.patch)
    return settings
  })

  registerMessageHandler('DOWNLOAD_MANAGER_GET_STATE', async () => getDownloadManagerState())

  registerMessageHandler('DOWNLOAD_MANAGER_ENQUEUE', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_ENQUEUE' }>
    const items = await enqueueUrls(m.items)
    kickQueue()
    return items
  })

  registerMessageHandler('DOWNLOAD_MANAGER_QUEUE_UPDATE', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_QUEUE_UPDATE' }>
    if (m.op === 'reorder' && m.order) await reorderQueue(m.order)
    if (m.op === 'remove' && m.id) await removeQueueItem(m.id)
    if (m.op === 'clear') await clearQueue(m.doneOnly)
    return await getDownloadManagerState()
  })

  registerMessageHandler('DOWNLOAD_MANAGER_SCHEDULE', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_SCHEDULE' }>
    if (m.op === 'delete' && m.jobId) {
      await deleteSchedule(m.jobId)
      return await getDownloadManagerState()
    }
    if (m.job) {
      await upsertSchedule(m.job)
      return await getDownloadManagerState()
    }
    return await getDownloadManagerState()
  })

  registerMessageHandler('DOWNLOAD_MANAGER_EXPORT_HISTORY', async (msg) => {
    const m = msg as Extract<ExtensionMessage, { type: 'DOWNLOAD_MANAGER_EXPORT_HISTORY' }>
    const items = await searchDownloads({})
    if (m.format === 'json') return JSON.stringify(items, null, 2)
    const header = 'filename,url,bytes,state,startTime\n'
    const rows = items
      .map((item) => {
        const name = (item.filename || '').replace(/"/g, '""')
        const url = (item.finalUrl || item.url || '').replace(/"/g, '""')
        return `"${name}","${url}",${item.totalBytes ?? item.bytesReceived},${item.state},${item.startTime ?? ''}`
      })
      .join('\n')
    return header + rows
  })
}
