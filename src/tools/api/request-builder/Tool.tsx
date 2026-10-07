import { ToolboxApiClient } from '@/features/api-client/ToolboxApiClient'
import { ToolPage } from '@/shared/components/ToolPage'
import { useApiTool } from '../_shared'

export default function ApiRequestBuilderTool() {
  const tool = useApiTool('api.request-builder')

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
      <div className="flex min-h-0 flex-1 flex-col">
        <ToolboxApiClient />
      </div>
    </ToolPage>
  )
}
