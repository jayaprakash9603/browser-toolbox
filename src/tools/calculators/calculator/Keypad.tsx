import { motion } from 'motion/react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { type CalcKey } from './logic'

interface KeypadProps {
  rows: CalcKey[][]
  scientificRow?: CalcKey[]
  memoryRow?: CalcKey[]
  activeKey: string | null
  onPress: (key: CalcKey) => void
}

function CalcKeyButton({
  keyDef,
  active,
  onPress,
  className,
}: {
  keyDef: CalcKey
  active: boolean
  onPress: () => void
  className?: string
}) {
  const isOp = keyDef.kind === 'op' || keyDef.kind === 'fn' || keyDef.kind === 'const'
  const isAction = keyDef.kind === 'action'
  const isEquals = keyDef.id === 'equals'
  return (
    <motion.div layout className={className}>
      <Button
        type="button"
        variant={isEquals ? 'default' : isOp ? 'secondary' : 'outline'}
        size="sm"
        title={keyDef.title ?? keyDef.label}
        aria-label={keyDef.title ?? keyDef.label}
        onClick={onPress}
        className={cn(
          'h-11 w-full cursor-pointer font-mono text-base font-medium tabular-nums shadow-xs transition-transform active:scale-[0.96] motion-reduce:active:scale-100',
          isEquals && 'h-12 text-lg font-semibold',
          isAction && !isEquals && 'bg-muted/40',
          active && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
          keyDef.kind === 'digit' && 'bg-background/80',
        )}
      >
        {keyDef.label}
      </Button>
    </motion.div>
  )
}

export function Keypad({ rows, scientificRow, memoryRow, activeKey, onPress }: KeypadProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {memoryRow && memoryRow.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {memoryRow.map((key) => (
            <CalcKeyButton key={key.id} keyDef={key} active={activeKey === key.id} onPress={() => onPress(key)} />
          ))}
        </div>
      )}
      {scientificRow && scientificRow.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-4 gap-1.5 overflow-hidden @[360px]:grid-cols-6"
        >
          {scientificRow.map((key) => (
            <CalcKeyButton key={key.id} keyDef={key} active={activeKey === key.id} onPress={() => onPress(key)} />
          ))}
        </motion.div>
      )}
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn('grid gap-1.5', row.some((k) => k.wide) ? 'grid-cols-4' : 'grid-cols-4')}
        >
          {row.map((key) => (
            <CalcKeyButton
              key={key.id}
              keyDef={key}
              active={activeKey === key.id}
              onPress={() => onPress(key)}
              className={key.wide ? 'col-span-2' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
