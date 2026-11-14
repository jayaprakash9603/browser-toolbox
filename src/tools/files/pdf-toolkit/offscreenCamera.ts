import { sendMessage } from '@/core/messaging'

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, encoded] = dataUrl.split(',')
  const mime = /data:([^;]+);/u.exec(meta)?.[1] ?? 'image/jpeg'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

export async function prepareOffscreenCamera(): Promise<void> {
  await sendMessage({ type: 'SCAN_CAMERA_PREPARE' })
}

export async function startOffscreenCamera(): Promise<void> {
  const started = await sendMessage<{ active: boolean }>({ type: 'OFFSCREEN_CAMERA_START' })
  if (!started?.active) throw new Error('Could not start the camera.')
}

export async function stopOffscreenCamera(): Promise<void> {
  await sendMessage({ type: 'OFFSCREEN_CAMERA_STOP' })
  await sendMessage({ type: 'SCAN_CAMERA_RELEASE' })
}

export async function pollOffscreenCameraFrame(): Promise<string | null> {
  const data = await sendMessage<{ frame: string | null }>({ type: 'OFFSCREEN_CAMERA_FRAME' })
  return data?.frame ?? null
}

export async function snapOffscreenCamera(): Promise<Blob | null> {
  const data = await sendMessage<{ frame: string | null }>({ type: 'OFFSCREEN_CAMERA_SNAP' })
  if (!data?.frame) return null
  return dataUrlToBlob(data.frame)
}