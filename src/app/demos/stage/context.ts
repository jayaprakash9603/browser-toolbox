import { BoxIcon, type LucideIcon } from 'lucide-react'
import { createContext, useContext } from 'react'

export interface ToolMeta {
  id: string
  name: string
  icon: LucideIcon
  accent: string
}

export const ToolMetaContext = createContext<ToolMeta>({
  id: '',
  name: 'One Panel',
  icon: BoxIcon,
  accent: '#6366f1',
})

export function useToolMeta() {
  return useContext(ToolMetaContext)
}

export interface DemoControls {
  jump: (index: number) => void
  toggle: () => void
}

/** How the surrounding UI drives a stage. Without a provider a stage behaves like the website's hero demo. */
export interface DemoHost {
  /** `card` drops the frame and caption bar so the host can draw its own; `player` keeps the website controls. */
  variant: 'card' | 'player'
  /** Loop the timeline; when false the stage plays once and calls `onCycle` at the end. */
  loop: boolean
  /** External gate (card on screen, demos not paused). The stage also pauses offscreen and in hidden tabs. */
  playing: boolean
  /** End of a one-shot timeline, or each loop of a looping one. */
  onCycle?: () => void
  onStep?: (index: number, steps: readonly string[]) => void
  /** Called every frame with 0..1; write to the DOM rather than React state. */
  onProgress?: (progress: number) => void
  onPlayingChange?: (playing: boolean) => void
  /** Receives seek and play controls once the timeline exists, and `null` when it goes away. */
  onControls?: (controls: DemoControls | null) => void
}

export const DemoHostContext = createContext<DemoHost>({ variant: 'player', loop: true, playing: true })

export function useDemoHost() {
  return useContext(DemoHostContext)
}
