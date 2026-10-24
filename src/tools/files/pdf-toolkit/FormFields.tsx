import { useTranslation } from 'react-i18next'

import type { FormFieldInfo, FormValues } from '@/core/engines/pdf/edit'
import { OptionField, OptionSwitch } from '@/shared/components/toolkit'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'

/** Inputs for a PDF's existing form fields; unchanged fields keep their current value. */
export function FormFields({ fields, values, onChange }: { fields: FormFieldInfo[]; values: FormValues; onChange: (values: FormValues) => void }) {
  const { t } = useTranslation()
  const set = (name: string, value: string | boolean) => onChange({ ...values, [name]: value })
  return (
    <div className="grid gap-2.5 @[560px]:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.name] ?? field.value
        const label = field.name.replace(/[._]/g, ' ')
        if (field.type === 'checkbox') {
          return <OptionSwitch key={field.name} label={label} checked={value === true} onChange={(next) => set(field.name, next)} disabled={field.readOnly} />
        }
        if ((field.type === 'dropdown' || field.type === 'radio' || field.type === 'list') && field.options.length) {
          return (
            <OptionField key={field.name} label={label}>
              <Select value={typeof value === 'string' && value ? value : undefined} onValueChange={(next) => set(field.name, next)} disabled={field.readOnly}>
                <SelectTrigger className="w-full" aria-label={label}>
                  <SelectValue placeholder={t('pdf.sign.choose')} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>
          )
        }
        if (field.type === 'text') {
          return (
            <OptionField key={field.name} label={label} className={field.multiline ? '@[560px]:col-span-2' : undefined}>
              {field.multiline ? (
                <Textarea value={String(value)} onChange={(event) => set(field.name, event.target.value)} disabled={field.readOnly} rows={3} aria-label={label} />
              ) : (
                <Input value={String(value)} onChange={(event) => set(field.name, event.target.value)} disabled={field.readOnly} className="h-8" aria-label={label} />
              )}
            </OptionField>
          )
        }
        return null
      })}
    </div>
  )
}
