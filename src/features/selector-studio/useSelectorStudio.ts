import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CapturedElement } from '@/core/engines/selector'
import {
  applyEvaluation,
  applyScores,
  generateCandidates,
  rankCandidates,
  snapshotFromCaptured,
  type ElementInspect,
  type RankMode,
  type SelectorCandidate,
  type SelectorSnapshot,
} from '@/core/engines/selector-studio'

import {
  DEFAULT_SETTINGS,
  entryFromCandidate,
  loadStudioStore,
  pushHistory,
  removeHistory,
  saveStudioSettings,
  updateHistory,
  type HistoryEntry,
  type StudioSettings,
} from './history'
import type { PickedStore, StudioPageClient } from './pageClient'

const VALIDATE_DEBOUNCE_MS = 250
const PICK_POLL_MS = 350

function snapshotOf(store: PickedStore | null, pageUrl: string): SelectorSnapshot | null {
  if (store?.snapshot) return store.snapshot
  const captured = (store as { element?: CapturedElement } | null)?.element
  if (captured) return snapshotFromCaptured(captured, pageUrl)
  return null
}

export function useSelectorStudio(client: StudioPageClient) {
  const [snapshot, setSnapshot] = useState<SelectorSnapshot | null>(null)
  const [candidates, setCandidates] = useState<SelectorCandidate[]>([])
  const [active, setActive] = useState<SelectorCandidate | null>(null)
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [pageUrl, setPageUrl] = useState('')
  const [picking, setPicking] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [highlighting, setHighlighting] = useState(false)
  const [stale, setStale] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchNotice, setMatchNotice] = useState('')
  const [inspect, setInspect] = useState<ElementInspect | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const request = useRef(0)
  const lastPickKey = useRef('')
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const shouldSyncPick = useCallback(() => {
    const current = settingsRef.current
    if (client.kind === 'devtools') return current.livePageSync
    return current.enabled && current.livePageSync
  }, [client.kind])

  const loadInspect = useCallback(
    async (next: SelectorSnapshot | null) => {
      if (!next) {
        setInspect(null)
        return
      }
      setInspecting(true)
      try {
        setInspect(await client.inspectElement(next.identityPath || null))
      } catch {
        setInspect(null)
      } finally {
        setInspecting(false)
      }
    },
    [client],
  )

  const applySnapshot = useCallback(
    async (next: SelectorSnapshot | null, mode = settingsRef.current.rankMode) => {
      if (!settingsRef.current.enabled && client.kind === 'side-panel') return
      setSnapshot(next)
      setPicking(false)
      if (!next) {
        setCandidates([])
        setActive(null)
        setInspect(null)
        return
      }
      lastPickKey.current = next.identityPath || `${next.tag}:${next.id}`
      const id = ++request.current
      setAnalyzing(true)
      setError(null)
      const drafts = generateCandidates(next, mode)
      const scored = rankCandidates(applyScores(drafts, next), mode)
      setCandidates(scored)
      setActive(scored[0] ?? null)
      setMatchNotice('')
      void loadInspect(next)
      if (settingsRef.current.autoHighlight && scored[0]) {
        void client.highlight(scored[0].kind, scored[0].expression, next.identityPath || null)
      }
      if (id === request.current) setAnalyzing(false)
    },
    [client, loadInspect],
  )

  useEffect(() => {
    let live = true
    void loadStudioStore().then((store) => {
      if (!live) return
      setSettings(store.settings)
      setHistory(store.history)
    })
    void client.resolveTab().then((tab) => {
      if (live && tab?.url) setPageUrl(tab.url)
    })
    void client.readPicked().then(async (picked) => {
      if (!live) return
      if (client.kind === 'devtools') {
        const fromElements = await client.captureDollarZero()
        if (fromElements) {
          void applySnapshot(fromElements)
          return
        }
      }
      if (!shouldSyncPick()) return
      const next = snapshotOf(picked, pageUrl)
      if (next) void applySnapshot(next)
    })
    const stopPicked = client.subscribePicked((picked) => {
      if (!shouldSyncPick()) return
      setStale(false)
      void client.resolveTab().then((tab) => {
        if (tab?.url) setPageUrl(tab.url)
        void applySnapshot(snapshotOf(picked, tab?.url ?? pageUrl))
      })
    })
    const stopNav = client.onNavigated(() => {
      setStale(true)
      setPicking(false)
      void client.cancelPicker()
      void client.clearHighlights()
    })
    const stopSel = client.onSelectionChanged(() => {
      void client.cancelPicker()
      void client.captureDollarZero().then((next) => {
        if (!next) return
        setStale(false)
        void applySnapshot(next)
      })
    })
    return () => {
      live = false
      stopPicked()
      stopNav()
      stopSel()
      void client.cancelPicker()
      void client.clearHighlights()
    }
    // Mount-only wiring; applySnapshot is stable enough for first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  useEffect(() => {
    if (!picking) return
    let live = true
    const tick = async () => {
      const picked = await client.readPicked()
      const next = snapshotOf(picked, pageUrl)
      if (!live || !next) return
      const key = next.identityPath || `${next.tag}:${next.id}`
      if (key && key === lastPickKey.current) return
      setStale(false)
      await applySnapshot(next)
    }
    const timer = window.setInterval(() => void tick(), PICK_POLL_MS)
    void tick()
    return () => {
      live = false
      window.clearInterval(timer)
    }
  }, [applySnapshot, client, pageUrl, picking])

  const setRankMode = useCallback(
    async (rankMode: RankMode) => {
      const next = { ...settings, rankMode }
      setSettings(next)
      await saveStudioSettings(next)
      if (snapshot) {
        setCandidates((current) => rankCandidates(current, rankMode))
        setActive((current) => {
          const ranked = rankCandidates(candidates, rankMode)
          return ranked[0] ?? current
        })
      }
    },
    [candidates, settings, snapshot],
  )

  const patchSettings = useCallback(async (patch: Partial<StudioSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    await saveStudioSettings(next)
    if (patch.enabled === false) {
      await client.cancelPicker()
      setPicking(false)
      await client.clearHighlights()
    }
  }, [client, settings])

  const pick = useCallback(async () => {
    if (!settingsRef.current.enabled && client.kind === 'side-panel') {
      setError('Selector Studio is disabled. Turn it on in the sidebar settings.')
      return
    }
    if (picking) {
      await client.cancelPicker()
      setPicking(false)
      return
    }
    setError(null)
    setStale(false)
    lastPickKey.current = ''
    try {
      await client.startPicker()
      setPicking(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the picker.')
    }
  }, [client, picking])

  const reanalyze = useCallback(async () => {
    if (client.kind === 'devtools') {
      const next = await client.captureDollarZero()
      if (next) {
        setStale(false)
        await applySnapshot(next)
        return
      }
    }
    if (snapshot) await applySnapshot(snapshot)
  }, [applySnapshot, client, snapshot])

  const testCandidate = useCallback(
    async (candidate: SelectorCandidate) => {
      if (!snapshot) return candidate
      const [result] = await client.evaluate(
        [{ kind: candidate.kind, expression: candidate.expression }],
        snapshot.identityPath || null,
      )
      const next = result ? applyEvaluation(candidate, result) : candidate
      const scored = applyScores([next], snapshot)[0]
      setCandidates((current) =>
        rankCandidates(
          current.map((item) => (item.id === scored.id || item.expression === scored.expression ? scored : item)),
          settings.rankMode,
        ),
      )
      setActive(scored)
      setMatchNotice(scored.matchCount == null ? '' : `${scored.matchCount} matching elements`)
      return scored
    },
    [client, settings.rankMode, snapshot],
  )

  const highlight = useCallback(
    async (candidate = active) => {
      if (!candidate || !snapshot) return
      setHighlighting(true)
      await client.highlight(candidate.kind, candidate.expression, snapshot.identityPath || null)
      setHighlighting(false)
    },
    [active, client, snapshot],
  )

  const clearHighlight = useCallback(async () => {
    await client.clearHighlights()
    setHighlighting(false)
  }, [client])

  const saveActive = useCallback(
    async (name?: string, favorite = false) => {
      if (!active) return
      const next = await pushHistory(
        entryFromCandidate(active, snapshot?.pageUrl || pageUrl, { name, favorite }),
      )
      setHistory(next)
    },
    [active, pageUrl, snapshot],
  )

  const debounce = useRef<number>(undefined)
  const validateExpression = useCallback(
    (kind: 'css' | 'xpath', expression: string) => {
      window.clearTimeout(debounce.current)
      debounce.current = window.setTimeout(() => {
        if (!expression.trim()) return
        const draft: SelectorCandidate = {
          id: `edit:${kind}:${expression}`,
          kind,
          strategy: 'attribute',
          expression,
          context: snapshot?.shadowHosts.length
            ? 'requires-shadow'
            : snapshot?.frame.isTop === false
              ? 'requires-frame'
              : 'browser',
          uniqueness: 'unknown',
          matchCount: null,
          intendedMatched: null,
          syntaxValid: null,
          score: 0,
          reasons: ['Manually edited'],
          warnings: [],
        }
        void testCandidate(draft)
      }, VALIDATE_DEBOUNCE_MS)
    },
    [snapshot, testCandidate],
  )

  const groups = useMemo(() => {
    const map = new Map<string, SelectorCandidate[]>()
    for (const item of candidates) {
      const list = map.get(item.strategy) ?? []
      list.push(item)
      map.set(item.strategy, list)
    }
    return map
  }, [candidates])

  return {
    snapshot,
    candidates,
    groups,
    active,
    setActive,
    settings,
    setRankMode,
    patchSettings,
    history,
    setHistory,
    pageUrl,
    picking,
    analyzing,
    highlighting,
    stale,
    error,
    matchNotice,
    elementInspect: inspect,
    inspecting,
    pick,
    reanalyze,
    testCandidate,
    highlight,
    clearHighlight,
    saveActive,
    validateExpression,
    updateHistoryEntry: async (id: string, patch: Partial<HistoryEntry>) => {
      setHistory(await updateHistory(id, patch))
    },
    removeHistoryEntry: async (id: string) => {
      setHistory(await removeHistory(id))
    },
    restoreHistory: async (entry: HistoryEntry) => {
      const draft: SelectorCandidate = {
        id: `history:${entry.id}`,
        kind: entry.kind,
        strategy: (entry.strategy as SelectorCandidate['strategy']) || 'attribute',
        expression: entry.expression,
        context: 'browser',
        uniqueness: entry.uniqueness,
        matchCount: entry.matchCount,
        intendedMatched: null,
        syntaxValid: null,
        score: 0,
        reasons: ['Restored from history'],
        warnings: [],
      }
      setActive(draft)
      await testCandidate(draft)
    },
    clearSelection: async () => {
      setSnapshot(null)
      setCandidates([])
      setActive(null)
      setStale(false)
      await client.clearHighlights()
    },
    inspect: () => void client.inspectCurrent(),
    client,
  }
}

export type SelectorStudioModel = ReturnType<typeof useSelectorStudio>
