import { useEffect, useState } from 'react'

export function useActiveTabUrl() {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      setUrl(tabs[0]?.url ?? null)
    })
    const onActivated = () => {
      void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        setUrl(tabs[0]?.url ?? null)
      })
    }
    chrome.tabs.onActivated.addListener(onActivated)
    return () => chrome.tabs.onActivated.removeListener(onActivated)
  }, [])

  return url
}
