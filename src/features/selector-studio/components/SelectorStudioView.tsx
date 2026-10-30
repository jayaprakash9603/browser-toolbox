import type { SelectorStudioModel } from '../useSelectorStudio'
import { SelectorStudioHubShell } from './SelectorStudioHubShell'
import { SelectorStudioPanelView } from './SelectorStudioPanelView'

export function SelectorStudioView(props: {
  model: SelectorStudioModel
  compact?: boolean
  embedded?: boolean
  pane?: boolean
}) {
  if (props.embedded) return <SelectorStudioPanelView model={props.model} />
  return (
    <SelectorStudioHubShell
      model={props.model}
      variant={props.pane ? 'pane' : 'devtools'}
    />
  )
}
