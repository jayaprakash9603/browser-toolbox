import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { describeColor, roleKey } from './paletteModel'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

export function useColorLabels() {
  const { t } = useTranslation()
  return useMemo(
    () => ({
      role: (index: number) => (index < 5 ? t(`pg.role.${roleKey(index)}`) : t('pg.role.color', { n: index + 1 })),
      name: (hex: string) => {
        const { hue, tone } = describeColor(hex)
        const hueName = t(`pg.hue.${hue}`)
        return tone ? t('pg.name.toned', { tone: t(`pg.tone.${tone}`), hue: hueName }) : hueName
      },
    }),
    [t],
  )
}

export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
