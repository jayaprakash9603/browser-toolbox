import QRCode from 'qrcode'

import { cn } from '@/shared/utils/cn'

interface QrProps {
  text: string
  size: number
  className?: string
  color?: string
  /** Quiet zone in modules. */
  margin?: number
}

/** A real, scannable QR code for `text`, drawn as one SVG path. */
export function Qr({ text, size, className, color = '#0b0b11', margin = 1 }: QrProps) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const count = modules.size
  let path = ''
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (modules.get(row, column)) path += `M${column + margin} ${row + margin}h1v1h-1z`
    }
  }
  const box = count + margin * 2
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      className={cn('block bg-white', className)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <path d={path} fill={color} />
    </svg>
  )
}
