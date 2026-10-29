import type { CapturedElement } from '@/core/engines/selector'

import type { SelectorSnapshot } from './types'

/** Rebuild a studio snapshot from the legacy picker payload when a live capture is missing. */
export function snapshotFromCaptured(element: CapturedElement, pageUrl = ''): SelectorSnapshot {
  return {
    tag: element.tag,
    id: element.id,
    classes: element.classes,
    attributes: element.attributes,
    text: element.text.replace(/\s+/g, ' ').trim().slice(0, 120),
    ownText: element.text.replace(/\s+/g, ' ').trim().slice(0, 80),
    parentChain: element.parentChain.map((parent, index) => ({
      tag: parent.tag,
      id: parent.id,
      classes: parent.classes,
      attributes: {},
      indexAmongSameTag: index === 0 ? element.indexAmongSiblings : 1,
      indexAmongSiblings: index === 0 ? element.indexAmongSiblings : 1,
    })),
    indexAmongSameTag: element.indexAmongSiblings,
    indexAmongSiblings: element.indexAmongSiblings,
    label: null,
    previousSibling: null,
    nextSibling: null,
    namespaceURI: element.tag === 'svg' || element.tag === 'path' ? 'http://www.w3.org/2000/svg' : null,
    isSvg: element.tag === 'svg' || element.tag === 'path',
    connected: true,
    shadowHosts: [],
    frame: { url: pageUrl, sameOrigin: true, isTop: true },
    identityPath: '',
    idUnique: element.id ? null : null,
    testIdUnique: null,
    pageUrl,
  }
}
