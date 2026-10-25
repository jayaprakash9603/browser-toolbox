import { InfoIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Alert className="border-primary/30 bg-primary/5">
        <InfoIcon />
        <AlertTitle>{t('scriptStudio.setup.title')}</AlertTitle>
        <AlertDescription>
          <p>{t('scriptStudio.setup.body')}</p>
          {probe?.error ? <p className="text-destructive">{probe.error}</p> : null}
          <Button className="mt-3 min-h-11" size="sm" onClick={() => void onEnable()}>
            {t('scriptStudio.setup.enable')}
          </Button>
        </AlertDescription>
      </Alert>
    </motion.div>
  )
}
