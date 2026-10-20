import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { SourceCondition } from '@/core/interceptor'

interface Props {
  value: SourceCondition
  onChange: (next: SourceCondition) => void
}

export function SourceConditionField({ value, onChange }: Props) {
  return (
    <div className="grid gap-2 @[400px]:grid-cols-3">
      <Select
        value={value.field}
        onValueChange={(field) => onChange({ ...value, field: field as SourceCondition['field'] })}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="url">URL</SelectItem>
          <SelectItem value="host">Host</SelectItem>
          <SelectItem value="path">Path</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={value.operator}
        onValueChange={(op) => onChange({ ...value, operator: op as SourceCondition['operator'] })}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="contains">Contains</SelectItem>
          <SelectItem value="equals">Equals</SelectItem>
          <SelectItem value="wildcard">Wildcard</SelectItem>
          <SelectItem value="regex">Regex</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={value.value}
        onChange={(e) => onChange({ ...value, value: e.target.value })}
        placeholder="Match value"
      />
    </div>
  )
}
