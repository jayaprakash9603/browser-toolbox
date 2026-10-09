import { useTranslation } from 'react-i18next'

import { getPopularTools } from '@/app/pages/home/homeConfig'
import { SectionHeader } from '@/app/pages/home/SectionHeader'
import { SlideUp } from '@/shared/components/motion'
import { ToolCardGrid } from '@/shared/components/ToolCardGrid'

export function PopularTools({ delay = 0.44 }: { delay?: number }) {
  const { t } = useTranslation()
  const tools = getPopularTools()

  return (
    <SlideUp delay={delay} className="mb-[var(--density-section-gap)]">
      <SectionHeader title={t('home.popularTools')} />
      <ToolCardGrid tools={tools} />
    </SlideUp>
  )
}
