import type { InterceptorState } from '@/core/interceptor'

import { RulesWorkspace } from './RulesWorkspace'

interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
  embedded?: boolean
}

export function RulesTab({ state, onStateChange, embedded }: Props) {
  return <RulesWorkspace state={state} onStateChange={onStateChange} embedded={embedded} />
}
