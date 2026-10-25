import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'

import type { UserScriptsProbe } from '../hooks/useScriptStudio'

type Props = {
  probe: UserScriptsProbe | null
  onEnable: () => void
}

export function SetupWizard({ probe, onEnable }: Props) {
  const { t } = useTranslation()
  if (probe?.operational) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <h3 className="text-sm font-semibold">{t('scriptStudio.setup.title')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('scriptStudio.setup.body')}</p>
      {probe?.error ? <p className="mt-2 text-xs text-destructive">{probe.error}</p> : null}
      <Button className="mt-3 min-h-11" onClick={() => void onEnable()}>
        {t('scriptStudio.setup.enable')}
      </Button>
    </motion.div>
  )
}
