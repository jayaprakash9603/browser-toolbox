export type SpeedPhase = 'idle' | 'latency' | 'download' | 'upload' | 'done' | 'error'

export interface SpeedServer {
  colo?: string
  city?: string
  country?: string
  ip?: string
  isp?: string
  asn?: number
  clientCity?: string
  clientRegion?: string
  clientCountry?: string
}

export interface SpeedTestResult {
  at: number
  pingMs: number | null
  jitterMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  downloadBytes: number
  uploadBytes: number
  server: SpeedServer
}

export type SpeedUpdate =
  | { type: 'phase'; phase: SpeedPhase }
  | { type: 'server'; server: SpeedServer }
  | { type: 'latency'; pingMs: number; jitterMs: number; progress: number }
  | { type: 'throughput'; phase: 'download' | 'upload'; mbps: number; progress: number; elapsedMs: number }
  | { type: 'final'; phase: 'download' | 'upload'; mbps: number | null }

export interface ThroughputPoint {
  t: number
  bytes: number
}
