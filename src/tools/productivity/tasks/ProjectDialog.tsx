import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { CheckIcon } from 'lucide-react'

import { PROJECT_COLORS, type ProjectColor, type TaskProject } from '@/core/tasks/model'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import { PROJECT_COLOR_STYLES } from './taskStyles'

interface ProjectDialogProps {
  open: boolean
  project: TaskProject | null
  suggestedColor: ProjectColor
  onOpenChange: (open: boolean) => void
  onSave: (name: string, color: ProjectColor) => void
}

export function ProjectDialog({ open, project, suggestedColor, onOpenChange, onSave }: ProjectDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-xs">
        <ProjectForm
          key={project?.id ?? 'new'}
          initialName={project?.name ?? ''}
          initialColor={project?.color ?? suggestedColor}
          title={project ? t('tasks.project.edit') : t('tasks.project.new')}
          submitLabel={project ? t('tasks.project.save') : t('tasks.project.create')}
          onCancel={() => onOpenChange(false)}
          onSave={(name, color) => {
            onSave(name, color)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

interface ProjectFormProps {
  initialName: string
  initialColor: ProjectColor
  title: string
  submitLabel: string
  onCancel: () => void
  onSave: (name: string, color: ProjectColor) => void
}

function ProjectForm({ initialName, initialColor, title, submitLabel, onCancel, onSave }: ProjectFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<ProjectColor>(initialColor)
  const trimmed = name.trim()

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed) onSave(trimmed, color)
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium">{t('tasks.project.name')}</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('tasks.project.namePlaceholder')}
          maxLength={60}
          autoFocus
          className="h-8 text-sm"
        />
      </label>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-medium">{t('tasks.project.color')}</legend>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t('tasks.project.color')}>
          {PROJECT_COLORS.map((value) => {
            const selected = value === color
            return (
              <motion.button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`tasks.colors.${value}`)}
                title={t(`tasks.colors.${value}`)}
                whileTap={{ scale: 0.88 }}
                onClick={() => setColor(value)}
                className={cn(
                  'mx-auto flex size-8 cursor-pointer items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
                  PROJECT_COLOR_STYLES[value].dot,
                  selected && 'ring-2 ring-foreground/60',
                )}
              >
                {selected && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                    <CheckIcon className="size-4 text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </div>
      </fieldset>
      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" size="sm" disabled={!trimmed}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
