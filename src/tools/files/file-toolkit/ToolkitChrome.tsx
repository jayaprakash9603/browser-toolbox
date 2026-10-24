import { useTranslation } from 'react-i18next'

import { GlyphPairArt, ModeTiles as SharedModeTiles, ToolkitHero as SharedToolkitHero } from '@/shared/components/toolkit'
import { MODE_META, MODES, type Mode } from './modes'

export function ToolkitHero({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const [from, to] = MODE_META[mode].pair
  return (
    <SharedToolkitHero
      motionKey={mode}
      badge={t('fs.hero.badge')}
      title={t(`fs.hero.${mode}.title`)}
      text={t(`fs.hero.${mode}.text`)}
      art={<GlyphPairArt motionKey={mode} from={from} to={to} />}
    />
  )
}

export function ModeTiles({ value }: { value: Mode }) {
  const { t } = useTranslation()
  return (
    <SharedModeTiles
      label={t('fs.modesLabel')}
      layoutId="file-toolkit-mode"
      value={value}
      tiles={MODES.map((mode) => ({
        value: mode,
        label: t(`fs.modes.${mode}`),
        hint: t(`fs.modes.${mode}Hint`),
        icon: MODE_META[mode].icon,
        tone: MODE_META[mode].tone,
      }))}
    />
  )
}
