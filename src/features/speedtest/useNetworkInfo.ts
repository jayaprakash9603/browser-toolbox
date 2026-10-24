import { useCallback, useEffect, useRef, useState } from 'react'

import { lookupConnection, reverseGeocode, type PlaceName, type SpeedServer } from '@/core/speedtest'

/** ISP, public IP and approximate location, fetched once when the tool opens. */
export function useConnectionInfo() {
  const [info, setInfo] = useState<SpeedServer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    lookupConnection(undefined, { signal: controller.signal })
      .then((result) => setInfo(result))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return { info, loading }
}

export type PreciseLocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'

export interface PreciseLocation {
  place: PlaceName
  latitude: number
  longitude: number
  accuracy: number
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 10 * 60_000,
    }),
  )
}

/** Opt-in device location. Only runs automatically when the user has already granted access. */
export function usePreciseLocation(language?: string) {
  const [status, setStatus] = useState<PreciseLocationStatus>('idle')
  const [location, setLocation] = useState<PreciseLocation | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const locate = useCallback(async () => {
    if (!('geolocation' in navigator)) return setStatus('unavailable')
    setStatus('locating')
    try {
      const { coords } = await currentPosition()
      const place = await reverseGeocode(coords.latitude, coords.longitude, { language }).catch(() => ({}))
      if (!mounted.current) return
      setLocation({ place, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy })
      setStatus('ready')
    } catch (error) {
      if (!mounted.current) return
      const denied = (error as GeolocationPositionError | undefined)?.code === 1
      setStatus(denied ? 'denied' : 'unavailable')
    }
  }, [language])

  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((perm) => {
        if (cancelled) return
        if (perm.state === 'granted') void locate()
        else if (perm.state === 'denied') setStatus('denied')
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [locate])

  return { status, location, locate }
}
