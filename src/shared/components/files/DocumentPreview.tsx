import { useMemo } from 'react'

import {
  FONT_STACKS,
  docToHtmlBody,
  pageGeometry,
  type DocBlock,
  type DocumentSettings,
} from '@/core/engines/files/document'
import { cn } from '@/shared/utils/cn'

/** Styles for the escaped markup produced by `docToHtmlBody`, in em so it scales with the sheet. */
const PAPER_PROSE = [
  '[&_h1]:mt-[1.1em] [&_h1]:mb-[0.35em] [&_h1]:text-[1.75em] [&_h1]:leading-tight [&_h1]:font-bold',
  '[&_h2]:mt-[1em] [&_h2]:mb-[0.3em] [&_h2]:text-[1.45em] [&_h2]:leading-tight [&_h2]:font-bold',
  '[&_h3]:mt-[0.9em] [&_h3]:mb-[0.3em] [&_h3]:text-[1.25em] [&_h3]:font-bold',
  '[&_h4]:mt-[0.8em] [&_h4]:text-[1.1em] [&_h4]:font-bold [&_h5]:font-bold [&_h6]:font-bold',
  '[&_.doc-title]:mt-0 [&_.doc-title]:mb-[0.8em] [&_.doc-title]:border-b-2 [&_.doc-title]:border-indigo-600 [&_.doc-title]:pb-[0.25em] [&_.doc-title]:text-[1.9em]',
  '[&_p]:mb-[0.6em] [&_p.line]:mb-0 [&_p.line]:whitespace-pre-wrap',
  '[&_ul]:mb-[0.6em] [&_ul]:list-disc [&_ul]:pl-[1.6em] [&_ol]:mb-[0.6em] [&_ol]:list-decimal [&_ol]:pl-[1.6em] [&_li.task]:-ml-[1.3em] [&_li.task]:list-none',
  '[&_blockquote]:mb-[0.7em] [&_blockquote]:border-l-[3px] [&_blockquote]:border-indigo-300 [&_blockquote]:pl-[0.9em] [&_blockquote]:text-slate-600 [&_blockquote]:italic',
  '[&_code]:rounded-[0.25em] [&_code]:bg-slate-100 [&_code]:px-[0.3em] [&_code]:font-mono [&_code]:text-[0.9em]',
  '[&_pre]:mb-[0.7em] [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre_code]:block [&_pre_code]:rounded-[0.4em] [&_pre_code]:p-[0.7em]',
  '[&_pre.plain]:m-0 [&_.ln]:mr-[1.5ch] [&_.ln]:inline-block [&_.ln]:min-w-[3ch] [&_.ln]:text-right [&_.ln]:text-slate-400 [&_.ln]:select-none',
  '[&_hr]:my-[1em] [&_hr]:border-slate-300 [&_a]:pointer-events-none [&_a]:text-indigo-700 [&_a]:underline',
].join(' ')

interface DocumentPreviewProps {
  blocks: DocBlock[]
  settings: DocumentSettings
  className?: string
}

/** One continuous sheet sized like the chosen page; Word and RTF reflow pages themselves. */
export function DocumentPreview({ blocks, settings, className }: DocumentPreviewProps) {
  const html = useMemo(() => docToHtmlBody(blocks, settings), [blocks, settings])
  const { width, height, margin } = pageGeometry(settings)
  const unit = (pt: number) => `${(pt / width) * 100}cqw`

  return (
    <div className={cn('mx-auto w-full', className)} style={{ maxWidth: Math.min(width * 1.15, 760), containerType: 'inline-size' }}>
      <div
        className={cn(
          'overflow-hidden rounded-[3px] bg-white break-words text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.12),0_12px_32px_-12px_rgb(15_23_42/0.35)] ring-1 ring-black/5',
          PAPER_PROSE,
          settings.font === 'mono' ? '[&_pre.plain]:font-mono' : '[&_pre.plain]:[font-family:inherit]',
        )}
        style={{
          minHeight: unit(height),
          padding: unit(margin),
          fontFamily: FONT_STACKS[settings.font],
          fontSize: unit(settings.fontSize),
          lineHeight: settings.lineHeight,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
