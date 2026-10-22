import { useEffect, useState } from 'react'
import { ArrowLeftIcon, DownloadIcon, ImageIcon, Trash2Icon } from 'lucide-react'

import { useRouter } from '@/app/router'
import { downloadBlobInExtension } from '@/core/screenshot/export'
import { sanitizeFilenamePart } from '@/core/screenshot/filename'
import {
  deleteScreenshotHistory,
  listScreenshotHistory,
  type ScreenshotHistoryEntry,
} from '@/core/screenshot/history'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/shared/components/ui/card'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'application/pdf': 'pdf',
}

export function CaptureHistory() {
  const { navigate } = useRouter()
  const [entries, setEntries] = useState<ScreenshotHistoryEntry[] | null>(null)

  const refresh = () => void listScreenshotHistory().then(setEntries)
  useEffect(refresh, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to capture"
            onClick={() => navigate('/tools/screenshots/capture')}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="text-xl font-semibold">Capture history</h1>
        </div>

        {entries?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 pt-12 text-center">
              <ImageIcon className="size-8 text-muted-foreground" />
              <CardTitle>No saved captures yet</CardTitle>
              <CardDescription>Captures appear here after you save them from the editor.</CardDescription>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries?.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <img
                src={item.thumbnail}
                alt=""
                className="aspect-video w-full border-b object-cover object-top"
              />
              <CardContent className="space-y-1 pt-3">
                <CardTitle className="truncate leading-tight" title={item.title}>
                  {item.title}
                </CardTitle>
                <CardDescription className="truncate" title={item.url}>
                  {new Date(item.createdAt).toLocaleString()}
                </CardDescription>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void downloadBlobInExtension(
                      item.blob,
                      `${sanitizeFilenamePart(item.title)}.${EXTENSION_BY_MIME[item.blob.type] ?? 'png'}`,
                    )
                  }
                >
                  <DownloadIcon /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteScreenshotHistory(item.id).then(refresh)}
                >
                  <Trash2Icon /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
