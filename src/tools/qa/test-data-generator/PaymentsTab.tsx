import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { CheckIcon, CircleAlertIcon, CircleCheckIcon, CopyIcon, SparklesIcon } from 'lucide-react'

import {
  CARD_BRAND_LABELS,
  checkCard,
  formatCardNumber,
  formatIban,
  GENERATABLE_BRANDS,
  generateCardNumber,
  generateIban,
  IBAN_COUNTRIES,
  ibanValid,
  normalizeIban,
  TEST_CARDS,
  createRng,
  randomSeed,
  type CardBrand,
  type TestCard,
} from '@/core/engines/testdata'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { cn } from '@/shared/utils/cn'
import { useCopyFlag } from './shared'

const SCENARIO_TONE: Record<string, string> = {
  success: 'border-green-500/40 text-green-600 dark:text-green-400',
  declined: 'border-destructive/40 text-destructive',
  insufficient: 'border-destructive/40 text-destructive',
  fraud: 'border-destructive/40 text-destructive',
  '3ds': 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  expired: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  cvc: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
}

function CheckPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
        ok
          ? 'border-green-500/40 text-green-600 dark:text-green-400'
          : 'border-destructive/40 text-destructive',
      )}
    >
      {ok ? <CircleCheckIcon className="size-3" /> : <CircleAlertIcon className="size-3" />}
      {label}
    </span>
  )
}

function TestCardRow({
  card,
  copied,
  onCopy,
}: {
  card: TestCard
  copied: boolean
  onCopy: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="w-20 shrink-0 text-[11px] font-medium text-muted-foreground">
        {CARD_BRAND_LABELS[card.brand]}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide">
        {formatCardNumber(card.number)}
      </code>
      <Badge variant="outline" className={cn('shrink-0', SCENARIO_TONE[card.scenario])}>
        {t(`testData.pay.scenario.${card.scenario}`)}
      </Badge>
      <span className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? <CheckIcon className="size-3.5 text-green-600" /> : <CopyIcon className="size-3.5" />}
      </span>
    </button>
  )
}

export function PaymentsTab() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const { copiedId, copy } = useCopyFlag()

  const [genBrand, setGenBrand] = useState<CardBrand>('visa')
  const [generated, setGenerated] = useState('')
  const [ibanCountry, setIbanCountry] = useState('DE')
  const [generatedIban, setGeneratedIban] = useState('')
  const [query, setQuery] = useState('')

  const check = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return null
    const normalized = normalizeIban(trimmed)
    if (/^[A-Z]{2}\d/.test(normalized)) {
      const valid = ibanValid(normalized)
      return { type: 'iban' as const, valid, country: normalized.slice(0, 2) }
    }
    return { type: 'card' as const, ...checkCard(trimmed) }
  }, [query])

  const generateCard = () => {
    const number = generateCardNumber(createRng(randomSeed()), genBrand)
    setGenerated(number)
  }

  const makeIban = () => setGeneratedIban(generateIban(createRng(randomSeed()), ibanCountry))

  return (
    <div className="scrollbar-both grid min-h-0 flex-1 content-start gap-3 overflow-y-auto lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:overflow-visible">
      <section className="flex flex-col gap-2 lg:min-h-0">
        <div>
          <h2 className="text-sm font-semibold">{t('testData.pay.cards.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('testData.pay.cards.subtitle')}</p>
        </div>
        <div className="scrollbar-both flex flex-col gap-1.5 lg:min-h-0 lg:flex-1 lg:overflow-auto lg:pr-0.5">
          {TEST_CARDS.map((card, index) => {
            const id = `card:${index}`
            return (
              <TestCardRow
                key={id}
                card={card}
                copied={copiedId === id}
                onCopy={() => copy(card.number, id)}
              />
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 lg:min-h-0">
        <div className="rounded-xl border bg-card/40 p-3">
          <h3 className="mb-2 text-xs font-semibold">{t('testData.pay.validator.title')}</h3>
          <p className="mb-2 text-xs text-muted-foreground">{t('testData.pay.validator.subtitle')}</p>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('testData.pay.validator.placeholder')}
            aria-label={t('testData.pay.validator.title')}
            className="h-8 font-mono text-xs"
          />
          <div className="mt-2 min-h-7">
            {check === null ? (
              <p className="text-[11px] text-muted-foreground">{t('testData.pay.validator.empty')}</p>
            ) : (
              <motion.div
                key={check.type + query}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center gap-1.5"
              >
                {check.type === 'card' ? (
                  <>
                    <Badge variant="outline" className="font-mono">
                      {check.brand ? CARD_BRAND_LABELS[check.brand] : t('testData.pay.validator.unknown')}
                    </Badge>
                    <CheckPill label={t('testData.pay.validator.luhn')} ok={check.luhn} />
                    <CheckPill label={t('testData.pay.validator.length')} ok={check.lengthOk} />
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="font-mono">
                      {check.country}
                    </Badge>
                    <CheckPill label={t('testData.pay.validator.iban')} ok={check.valid} />
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card/40 p-3">
          <h3 className="mb-2 text-xs font-semibold">{t('testData.pay.cards.title')}</h3>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{t('testData.pay.validator.brand')}</Label>
              <Select value={genBrand} onValueChange={(value) => setGenBrand(value as CardBrand)}>
                <SelectTrigger className="h-8" aria-label={t('testData.pay.validator.brand')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENERATABLE_BRANDS.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {CARD_BRAND_LABELS[brand]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={generateCard}>
              <SparklesIcon /> {t('testData.pay.generate')}
            </Button>
          </div>
          {generated && (
            <button
              type="button"
              onClick={() => copy(generated, 'gen-card')}
              className="group mt-2 flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:bg-accent"
            >
              <code className="flex-1 font-mono text-sm tracking-wide">{formatCardNumber(generated)}</code>
              {copiedId === 'gen-card' ? (
                <CheckIcon className="size-3.5 text-green-600" />
              ) : (
                <CopyIcon className="size-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        <div className="rounded-xl border bg-card/40 p-3">
          <h3 className="mb-2 text-xs font-semibold">{t('testData.pay.iban.title')}</h3>
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{t('testData.pay.iban.title')}</Label>
              <Select value={ibanCountry} onValueChange={setIbanCountry}>
                <SelectTrigger className="h-8" aria-label={t('testData.pay.iban.title')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IBAN_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.code} · {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="secondary" onClick={makeIban}>
              <SparklesIcon /> {t('testData.pay.iban.generate')}
            </Button>
          </div>
          {generatedIban && (
            <button
              type="button"
              onClick={() => copy(generatedIban, 'gen-iban')}
              className="group mt-2 flex w-full items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:bg-accent"
            >
              <code className="flex-1 font-mono text-sm tracking-wide">{formatIban(generatedIban)}</code>
              {copiedId === 'gen-iban' ? (
                <CheckIcon className="size-3.5 text-green-600" />
              ) : (
                <CopyIcon className="size-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
