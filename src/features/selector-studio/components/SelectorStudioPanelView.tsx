import type { SelectorStudioModel } from '../useSelectorStudio'
import { SelectorStudioHubShell } from './SelectorStudioHubShell'

export function SelectorStudioPanelView({ model }: { model: SelectorStudioModel }) {
  return <SelectorStudioHubShell model={model} variant="panel" />
}
