import { useTranslation } from 'react-i18next'

import type { SeoReport } from '@/core/engines/seo/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { MetaRow } from '../components'

export function SocialTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const ogImage = report.page.openGraph['og:image']
  const twImage = report.page.twitter['twitter:image'] ?? report.page.twitter['twitter:image:src']

  return (
    <Tabs defaultValue="og">
      <TabsList className="w-full">
        <TabsTrigger value="og" className="flex-1 text-[11px]">Open Graph</TabsTrigger>
        <TabsTrigger value="twitter" className="flex-1 text-[11px]">X / Twitter</TabsTrigger>
      </TabsList>
      <TabsContent value="og" className="mt-2 space-y-2">
        {Object.entries(report.page.openGraph).map(([k, v]) => (
          <MetaRow key={k} label={k} value={v} />
        ))}
        {ogImage && (
          <div className="rounded border p-2">
            <p className="mb-1 text-[11px] text-muted-foreground">{t('seo.preview')}</p>
            <img src={ogImage} alt="" className="max-h-32 rounded object-contain" />
            <p className="mt-1 text-[11px] font-medium">{report.page.openGraph['og:title']}</p>
            <p className="text-[10px] text-muted-foreground">
              {report.page.openGraph['og:description']}
            </p>
          </div>
        )}
      </TabsContent>
      <TabsContent value="twitter" className="mt-2 space-y-2">
        {Object.entries(report.page.twitter).map(([k, v]) => (
          <MetaRow key={k} label={k} value={v} />
        ))}
        {twImage && (
          <div className="rounded border p-2">
            <img src={twImage} alt="" className="max-h-32 rounded object-cover" />
            <p className="mt-1 text-[11px]">{report.page.twitter['twitter:title']}</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
