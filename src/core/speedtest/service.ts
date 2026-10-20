import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import type { SpeedTestResult } from './types'

const MAX_HISTORY = 30

export async function getSpeedHistory(): Promise<SpeedTestResult[]> {
  return (await get<SpeedTestResult[]>(STORAGE_KEYS.speedTestHistory)) ?? []
}

export async function addSpeedResult(result: SpeedTestResult): Promise<SpeedTestResult[]> {
  const next = [result, ...(await getSpeedHistory())].slice(0, MAX_HISTORY)
  await set(STORAGE_KEYS.speedTestHistory, next)
  return next
}

export async function clearSpeedHistory(): Promise<void> {
  await set(STORAGE_KEYS.speedTestHistory, [])
}
