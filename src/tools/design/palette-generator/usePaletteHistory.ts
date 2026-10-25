import { useCallback, useReducer } from 'react'

import type { Swatch } from './paletteModel'

export interface Snapshot {
  base: string
  swatches: Swatch[]
}

interface State {
  past: Snapshot[]
  present: Snapshot
  future: Snapshot[]
  /** Snapshot from before a run of transient updates, recorded once the run is committed. */
  pending: Snapshot | null
}

type Action =
  | { type: 'set'; snapshot: Snapshot; transient?: boolean }
  | { type: 'commit' }
  | { type: 'undo' }
  | { type: 'redo' }

const LIMIT = 60

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set': {
      if (action.transient) return { ...state, present: action.snapshot, pending: state.pending ?? state.present }
      const previous = state.pending ?? state.present
      return { past: [...state.past, previous].slice(-LIMIT), present: action.snapshot, future: [], pending: null }
    }
    case 'commit':
      if (!state.pending) return state
      return { past: [...state.past, state.pending].slice(-LIMIT), present: state.present, future: [], pending: null }
    case 'undo': {
      if (state.pending) return { ...state, present: state.pending, future: [state.present, ...state.future], pending: null }
      const previous = state.past.at(-1)
      if (!previous) return state
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future], pending: null }
    }
    case 'redo': {
      const [next, ...rest] = state.future
      if (!next) return state
      return { past: [...state.past, state.present], present: next, future: rest, pending: null }
    }
  }
}

export function usePaletteHistory(initial: () => Snapshot) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ past: [], present: initial(), future: [], pending: null }))
  const set = useCallback((snapshot: Snapshot, transient = false) => dispatch({ type: 'set', snapshot, transient }), [])
  const commit = useCallback(() => dispatch({ type: 'commit' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  return {
    present: state.present,
    canUndo: state.past.length > 0 || state.pending !== null,
    canRedo: state.future.length > 0,
    set,
    commit,
    undo,
    redo,
  }
}
