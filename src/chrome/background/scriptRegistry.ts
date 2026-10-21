/** Avoid unregister+register storms when the service worker wakes and sync runs with unchanged config. */

type RegisteredScript = chrome.scripting.RegisteredContentScript

function scriptFingerprint(script: RegisteredScript): string {
  const world = script.world ?? 'ISOLATED'
  return JSON.stringify({
    id: script.id,
    matches: [...(script.matches ?? [])].sort(),
    excludeMatches: [...(script.excludeMatches ?? [])].sort(),
    js: [...(script.js ?? [])].sort(),
    css: [...(script.css ?? [])].sort(),
    allFrames: script.allFrames ?? false,
    runAt: script.runAt ?? 'document_idle',
    world,
  })
}

function ruleFingerprint(rule: chrome.declarativeNetRequest.Rule): string {
  return JSON.stringify(rule)
}

/**
 * Registers only scripts that differ from what is already registered; unregisters owned ids
 * that are no longer desired.
 */
export async function reconcileContentScripts(
  ownedIds: string[],
  desired: RegisteredScript[],
): Promise<void> {
  const ownedSet = new Set(ownedIds)
  const desiredById = new Map(desired.map((s) => [s.id, s]))

  let existing: RegisteredScript[] = []
  try {
    existing = await chrome.scripting.getRegisteredContentScripts({ ids: ownedIds })
  } catch {
    existing = []
  }

  const toUnregister: string[] = []
  for (const id of ownedIds) {
    if (!desiredById.has(id)) toUnregister.push(id)
  }

  const toRegister: RegisteredScript[] = []
  for (const script of desired) {
    const prev = existing.find((e) => e.id === script.id)
    if (!prev || scriptFingerprint(prev) !== scriptFingerprint(script)) {
      toRegister.push(script)
      if (prev) toUnregister.push(script.id)
    }
  }

  if (toUnregister.length) {
    const unique = [...new Set(toUnregister)].filter((id) => ownedSet.has(id))
    if (unique.length) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: unique })
      } catch {
        /* already gone */
      }
    }
  }
  if (toRegister.length) {
    await chrome.scripting.registerContentScripts(toRegister)
  }
}

/**
 * Updates dynamic rules only when the owned rule set changed.
 */
export async function reconcileDynamicRules(
  isOwnedId: (id: number) => boolean,
  desiredRules: chrome.declarativeNetRequest.Rule[],
): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const ownedExisting = existing.filter((r) => isOwnedId(r.id))
  const desiredFp = desiredRules.map(ruleFingerprint).sort().join('\n')
  const existingFp = ownedExisting.map(ruleFingerprint).sort().join('\n')
  if (desiredFp === existingFp) return

  const removeRuleIds = ownedExisting.map((r) => r.id)
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: desiredRules,
  })
}
