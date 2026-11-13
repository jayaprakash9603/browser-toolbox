import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

import { cn } from '@/shared/utils/cn'
import { CHASSIS } from './chassis'
import {
  frameStyleForKind,
  resolveFrameFinish,
  type Device,
  type FrameColor,
  type FrameColorSetting,
  type FrameStyle,
  type NotchStyle,
} from './devices'

export function frameInsets(device: Pick<Device, 'kind' | 'frameStyle'>, frame: boolean) {
  if (!frame) return { x: 0, top: 0, bottom: 0 }
  const style = device.frameStyle ?? frameStyleForKind(device.kind)
  switch (style) {
    case 'iphone':
    case 'iphone-home':
      return { x: 10, top: 10, bottom: 10 }
    case 'android':
    case 'fold':
    case 'flip':
      return { x: 10, top: 10, bottom: 10 }
    case 'tablet-ios':
    case 'tablet-android':
      return { x: 14, top: 14, bottom: 14 }
    case 'laptop':
      return { x: 10, top: 28, bottom: 14 }
    case 'desktop':
      return { x: 16, top: 16, bottom: 52 }
    case 'watch':
      return { x: 16, top: 16, bottom: 16 }
    case 'tv':
      return { x: 18, top: 18, bottom: 44 }
    case 'kiosk':
      return { x: 22, top: 22, bottom: 22 }
    default:
      return { x: 8, top: 8, bottom: 8 }
  }
}

const RING: Record<FrameColor, string> = {
  black: CHASSIS.black.ring,
  silver: CHASSIS.silver.ring,
  titanium: CHASSIS.titanium.ring,
  white: CHASSIS.white.ring,
  graphite: CHASSIS.graphite.ring,
}

const BUTTON: Record<FrameColor, string> = {
  black: CHASSIS.black.button,
  silver: CHASSIS.silver.button,
  titanium: CHASSIS.titanium.button,
  white: CHASSIS.white.button,
  graphite: CHASSIS.graphite.button,
}

function clockLabel(now: Date) {
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function StatusBar({
  style,
  landscape,
}: {
  style: 'ios' | 'android'
  landscape: boolean
}) {
  const [time, setTime] = useState(() => clockLabel(new Date()))
  useEffect(() => {
    const tick = () => setTime(clockLabel(new Date()))
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [])
  if (style === 'android') {
    return (
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 text-[10px] font-medium text-white mix-blend-difference',
          landscape ? 'h-6' : 'h-7',
        )}
        aria-hidden
      >
        <span className="tabular-nums">{time}</span>
        <span className="flex items-center gap-1.5">
          <SignalBars />
          <WifiMark />
          <BatteryMark android />
        </span>
      </div>
    )
  }
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 text-[11px] font-semibold text-white mix-blend-difference',
        landscape ? 'h-7' : 'h-8',
      )}
      aria-hidden
    >
      <span className="tabular-nums tracking-tight">{time}</span>
      <span className="flex items-center gap-1.5">
        <SignalBars />
        <WifiMark />
        <BatteryMark />
      </span>
    </div>
  )
}

function SignalBars() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
      <rect x="0" y="7" width="2" height="3" rx="0.5" />
      <rect x="4" y="5" width="2" height="5" rx="0.5" />
      <rect x="8" y="3" width="2" height="7" rx="0.5" />
      <rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45" />
    </svg>
  )
}

function WifiMark() {
  return (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M1.4 4.2a7 7 0 0 1 10.2 0" />
      <path d="M3.2 6a4.4 4.4 0 0 1 6.6 0" />
      <circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BatteryMark({ android = false }: { android?: boolean }) {
  return (
    <svg width={android ? 18 : 22} height="10" viewBox="0 0 22 10" fill="none">
      <rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor" />
      <rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor" />
    </svg>
  )
}

function Cutout({ kind, landscape }: { kind: NotchStyle; landscape: boolean }) {
  if (kind === 'none') return null
  if (kind === 'island') {
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute z-20 rounded-full bg-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]',
          landscape ? 'top-1/2 left-1.5 h-[36%] w-[14px] -translate-y-1/2' : 'top-[11px] left-1/2 h-[14px] w-[36%] -translate-x-1/2',
        )}
      />
    )
  }
  if (kind === 'notch') {
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute z-20 bg-neutral-950',
          landscape
            ? 'top-1/2 left-0 h-[22%] w-4 -translate-y-1/2 rounded-r-2xl'
            : 'top-0 left-1/2 h-5 w-[34%] -translate-x-1/2 rounded-b-2xl',
        )}
      />
    )
  }
  if (kind === 'punch-hole') {
    return (
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute z-20 size-[9px] rounded-full bg-neutral-950 ring-2 ring-black/40',
          landscape ? 'top-1/2 left-2 -translate-y-1/2' : 'top-2 left-1/2 -translate-x-1/2',
        )}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-20 rounded-full bg-neutral-950',
        landscape ? 'top-1/2 left-1.5 h-[24%] w-2 -translate-y-1/2' : 'top-1.5 left-1/2 h-1.5 w-[22%] -translate-x-1/2',
      )}
    />
  )
}

function HomeIndicator({ landscape }: { landscape: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-20 rounded-full bg-white/90',
        landscape ? 'top-1/2 right-2 h-[22%] w-[5px] -translate-y-1/2' : 'bottom-2 left-1/2 h-[5px] w-[33%] -translate-x-1/2',
      )}
    />
  )
}

function AndroidNav({ landscape }: { landscape: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-20 flex items-center justify-evenly text-white/80 mix-blend-difference',
        landscape ? 'inset-y-0 right-0 w-8 flex-col' : 'inset-x-0 bottom-0 h-7',
      )}
    >
      <span className="size-2.5 rounded-sm border border-current" />
      <span className="size-2.5 rounded-full border border-current" />
      <span className="h-0.5 w-2.5 rounded-full bg-current" />
    </div>
  )
}

function SideButtons({ color, style }: { color: FrameColor; style: FrameStyle }) {
  const fill = BUTTON[color]
  const ios = style === 'iphone' || style === 'iphone-home' || style === 'tablet-ios'
  return (
    <>
      <span aria-hidden className="absolute top-[16%] -left-[3px] h-[7%] w-[3px] rounded-l-sm" style={{ background: fill }} />
      <span aria-hidden className="absolute top-[26%] -left-[3px] h-[11%] w-[3px] rounded-l-sm" style={{ background: fill }} />
      <span aria-hidden className="absolute top-[39%] -left-[3px] h-[11%] w-[3px] rounded-l-sm" style={{ background: fill }} />
      <span
        aria-hidden
        className="absolute -right-[3px] w-[3px] rounded-r-sm"
        style={{ background: fill, top: ios ? '22%' : '28%', height: ios ? '14%' : '11%' }}
      />
    </>
  )
}

function Chassis({
  color,
  radius,
  shadow,
  children,
  className,
  extraStyle,
}: {
  color: FrameColor
  radius: number
  shadow: boolean
  children: ReactNode
  className?: string
  extraStyle?: CSSProperties
}) {
  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{
        background: CHASSIS[color].fill,
        borderRadius: radius,
        boxShadow: shadow
          ? `0 1px 0 ${RING[color]}, 0 18px 50px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35)`
          : `0 0 0 1px ${RING[color]}`,
        ...extraStyle,
      }}
    >
      {children}
    </div>
  )
}

export interface DeviceFrameProps {
  device: Device
  frame: boolean
  hostname: string
  rotated: boolean
  color?: FrameColorSetting
  showStatusBar?: boolean
  showNavBar?: boolean
  showSafeArea?: boolean
  keyboard?: boolean
  brightness?: number
  performance?: boolean
  folded?: boolean
  children: ReactNode
}

export function DeviceFrame({
  device,
  frame,
  hostname,
  rotated,
  color,
  showStatusBar = true,
  showNavBar = true,
  showSafeArea = false,
  keyboard = false,
  brightness = 1,
  performance = false,
  folded = false,
  children,
}: DeviceFrameProps) {
  const style = device.frameStyle ?? frameStyleForKind(device.kind)
  const finish = resolveFrameFinish(color, device)
  const landscape = rotated
  const screenRadius =
    style === 'iphone' || style === 'iphone-home' ? 40 : style === 'watch' ? 28 : style === 'android' || style === 'fold' || style === 'flip' ? 28 : 16

  if (!frame) {
    return (
      <div className="relative shrink-0 overflow-hidden rounded-md shadow-lg ring-1 ring-border">
        {children}
        {brightness < 1 && (
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 1 - brightness }} />
        )}
      </div>
    )
  }

  if (style === 'laptop') {
    return (
      <div className="relative shrink-0">
        <Chassis color={finish} radius={18} shadow={!performance} className="p-2.5 pt-0">
          <div className="flex h-7 items-center gap-1.5 px-2" aria-hidden>
            <span className="size-2 rounded-full bg-red-400/85" />
            <span className="size-2 rounded-full bg-amber-400/85" />
            <span className="size-2 rounded-full bg-emerald-400/80" />
            <span className="mx-auto min-w-0 max-w-[70%] truncate rounded-full bg-black/20 px-2 text-[9px] leading-4 text-white/80">
              {hostname}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-md bg-black">{children}</div>
        </Chassis>
        <div
          aria-hidden
          className="mx-auto h-2 w-[108%] -translate-x-[4%] rounded-b-xl"
          style={{ background: CHASSIS[finish].fill }}
        />
        <Brightness brightness={brightness} />
      </div>
    )
  }

  if (style === 'desktop' || style === 'tv') {
    return (
      <div className="relative flex shrink-0 flex-col items-center">
        <Chassis color={finish} radius={style === 'tv' ? 10 : 14} shadow={!performance} className="p-3">
          <div className="relative overflow-hidden rounded-sm bg-black">{children}</div>
        </Chassis>
        <div aria-hidden className="h-8 w-3" style={{ background: BUTTON[finish] }} />
        <div aria-hidden className="h-2 w-28 rounded-full" style={{ background: CHASSIS[finish].fill }} />
        <Brightness brightness={brightness} />
      </div>
    )
  }

  if (style === 'watch') {
    const round = device.width === device.height
    return (
      <div className="relative shrink-0">
        <span aria-hidden className="absolute top-[22%] -right-[8px] h-[18%] w-2 rounded-r-sm" style={{ background: BUTTON[finish] }} />
        <Chassis color={finish} radius={round ? 999 : 42} shadow={!performance} className="p-3">
          <div className={cn('relative overflow-hidden bg-black', round ? 'rounded-full' : 'rounded-[28px]')}>
            {children}
            {showStatusBar && device.statusBar && device.statusBar !== 'none' && (
              <StatusBar style={device.statusBar} landscape={false} />
            )}
          </div>
        </Chassis>
        <span aria-hidden className="absolute top-[18%] -left-[6px] h-[12%] w-1.5 rounded-l-sm" style={{ background: BUTTON[finish] }} />
        <Brightness brightness={brightness} />
      </div>
    )
  }

  if (style === 'kiosk') {
    return (
      <Chassis color={finish} radius={8} shadow={!performance} className="p-4">
        <div className="relative overflow-hidden rounded-sm bg-black">{children}</div>
        <Brightness brightness={brightness} />
      </Chassis>
    )
  }

  const radius = style === 'iphone' || style === 'iphone-home' ? 50 : style === 'tablet-ios' ? 28 : 34
  const pad = style.startsWith('tablet') ? 14 : style === 'iphone' || style === 'iphone-home' ? 10 : 12
  const fold = style === 'fold' && !folded

  return (
    <div className="relative shrink-0">
      <SideButtons color={finish} style={style} />
      <Chassis color={finish} radius={radius} shadow={!performance} extraStyle={{ padding: pad }}>
        <div className="relative overflow-hidden bg-black" style={{ borderRadius: screenRadius }}>
          {children}
          {fold && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-black/40" />
          )}
          {showStatusBar && device.statusBar && device.statusBar !== 'none' && (
            <StatusBar style={device.statusBar} landscape={landscape} />
          )}
          <Cutout kind={device.notch ?? 'none'} landscape={landscape} />
          {showNavBar && device.navBar === 'home-indicator' && <HomeIndicator landscape={landscape} />}
          {showNavBar && device.navBar === 'android' && <AndroidNav landscape={landscape} />}
          {showSafeArea && device.safeArea && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 border border-dashed border-sky-400/70"
              style={{
                borderTopWidth: device.safeArea.top ? 2 : 0,
                borderBottomWidth: device.safeArea.bottom ? 2 : 0,
                marginTop: device.safeArea.top,
                marginBottom: device.safeArea.bottom,
                marginLeft: device.safeArea.left,
                marginRight: device.safeArea.right,
              }}
            />
          )}
          {keyboard && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[38%] flex-col justify-end bg-neutral-800/95 p-1.5"
            >
              <div className="grid grid-cols-10 gap-0.5">
                {Array.from({ length: 30 }, (_, index) => (
                  <span key={index} className="h-3.5 rounded-sm bg-neutral-600/90" />
                ))}
              </div>
            </div>
          )}
          <Brightness brightness={brightness} />
        </div>
      </Chassis>
    </div>
  )
}

function Brightness({ brightness }: { brightness: number }) {
  if (brightness >= 1) return null
  return <span aria-hidden className="pointer-events-none absolute inset-0 z-30 bg-black" style={{ opacity: 1 - brightness }} />
}

/** Miniature chassis used in the device picker — not a screenshot. */
export function DeviceThumb({ device, className }: { device: Device; className?: string }) {
  const style = device.frameStyle ?? frameStyleForKind(device.kind)
  const ratio = device.height / Math.max(1, device.width)
  const phone = style === 'iphone' || style === 'iphone-home' || style === 'android' || style === 'fold' || style === 'flip'
  const watch = style === 'watch'
  return (
    <span
      aria-hidden
      className={cn('relative inline-flex items-center justify-center', className)}
    >
      <span
        className={cn(
          'border border-black/20 bg-gradient-to-br from-neutral-600 to-neutral-900 shadow-sm dark:border-white/15',
          watch ? 'rounded-[28%]' : phone ? 'rounded-[22%]' : 'rounded-[12%]',
        )}
        style={{ width: 22, height: Math.min(34, Math.max(16, 22 * Math.min(ratio, 2.2))) }}
      >
        {device.notch === 'island' && (
          <span className="absolute top-[7%] left-1/2 h-[9%] w-[42%] -translate-x-1/2 rounded-full bg-black" />
        )}
        {device.notch === 'punch-hole' && (
          <span className="absolute top-[8%] left-1/2 size-1 -translate-x-1/2 rounded-full bg-black" />
        )}
      </span>
    </span>
  )
}
