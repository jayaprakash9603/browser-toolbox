import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BellIcon, FileTextIcon, FolderIcon, FolderOpenIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  IMAGE_NAMING_MODES,
  downloadPath,
  sanitizeFolder,
  suggestFilename,
  type ImageNaming,
  type SaveImageAsState,
} from '@/core/imageConvert'
import { OptionSwitch, PanelSection } from '@/shared/components/toolkit'
import { Segmented } from '@/shared/components/ui/segmented'

import { EASE_OUT } from './formatMeta'

const SAMPLE = {
  pageTitle: 'Sunset over the bay',
  imageUrl: 'https://images.example.com/photos/IMG_2048.png',
  pageUrl: 'https://www.example.com/gallery',
}

interface PanelProps {
  state: SaveImageAsState
  patch: (next: Partial<SaveImageAsState>) => unknown
}

export function SavingPanel({ state, patch }: PanelProps) {
  const { t } = useTranslation()
  const folderId = useId()
  const [folderDraft, setFolderDraft] = useState<string | null>(null)
  const folder = folderDraft == null ? state.folder : sanitizeFolder(folderDraft)
  const sampleFormat = state.quickFormat ?? state.formats[0]
  const example = suggestFilename(sampleFormat, SAMPLE, state.naming)
  const segments = ['Downloads', ...(folder ? folder.split('/') : [])]

  const commitFolder = () => {
    if (folderDraft == null) return
    const next = sanitizeFolder(folderDraft)
    setFolderDraft(null)
    if (next !== state.folder) patch({ folder: next })
  }

  return (
    <>
      <PanelSection title={t('sia.saving.nameTitle')} icon={<FileTextIcon />}>
        <Segmented<ImageNaming>
          ariaLabel={t('sia.saving.nameTitle')}
          value={state.naming}
          onValueChange={(naming) => patch({ naming })}
          options={IMAGE_NAMING_MODES.map((mode) => ({ value: mode, label: t(`sia.saving.naming.${mode}`) }))}
          className="flex w-full [&>button]:flex-1"
        />
        <div className="rounded-xl border bg-muted/30 p-2.5">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('sia.saving.example')}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-1 font-mono text-[11px]">
            {segments.map((segment, index) => (
              <motion.span
                key={`${index}-${segment}`}
                layout
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-1 text-muted-foreground"
              >
                <FolderIcon className="size-3 shrink-0" aria-hidden />
                {segment}
                <span aria-hidden>/</span>
              </motion.span>
            ))}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={example}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="min-w-0 break-all rounded bg-primary/10 px-1 font-semibold text-primary"
              >
                {example}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{t(`sia.saving.namingHint.${state.naming}`)}</p>
        </div>
      </PanelSection>

      <PanelSection title={t('sia.saving.folderTitle')} icon={<FolderOpenIcon />}>
        <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
          <label htmlFor={folderId} className="flex h-full shrink-0 items-center gap-1.5 border-r bg-muted/40 px-2.5 font-mono text-[11px] text-muted-foreground">
            <FolderIcon className="size-3.5" aria-hidden />
            Downloads/
          </label>
          <input
            id={folderId}
            value={folderDraft ?? state.folder}
            onChange={(e) => setFolderDraft(e.target.value)}
            onBlur={commitFolder}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder={t('sia.saving.folderPlaceholder')}
            spellCheck={false}
            maxLength={80}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 font-mono text-xs outline-none placeholder:font-sans placeholder:text-muted-foreground/70"
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          {t('sia.saving.folderHint', { path: downloadPath(folder, example) })}
        </p>
      </PanelSection>

      <PanelSection title={t('sia.saving.behaviorTitle')} icon={<BellIcon />}>
        <OptionSwitch
          label={t('saveImageAs.askFilename')}
          hint={t('saveImageAs.askFilenameHint')}
          checked={state.askFilename}
          onChange={(askFilename) => patch({ askFilename })}
        />
        <OptionSwitch
          label={t('sia.saving.notify')}
          hint={t('sia.saving.notifyHint')}
          checked={state.notifyOnSave}
          onChange={(notifyOnSave) => patch({ notifyOnSave })}
        />
      </PanelSection>
    </>
  )
}
