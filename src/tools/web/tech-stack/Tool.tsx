import { TechStackView } from '@/features/tech-stack/components/TechStackView'
import { ToolPage } from '@/shared/components/ToolPage'

import { useWebTool } from '../_shared'

export default function TechStackTool() {
  const tool = useWebTool('web.tech-stack')

  return (
    <ToolPage tool={tool} contentClassName="p-0">
      <TechStackView />
    </ToolPage>
  )
}
