import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, Trash2Icon } from 'lucide-react'

import { sendMessage } from '@/core/messaging'
import {
  BROADCAST_DAILY_CAP_DEFAULT,
  type BroadcastCampaign,
  type MessageTemplate,
  type ScheduledMessage,
  type SmartReplyRule,
  type WaTask,
  type WebhookConfig,
  type WhatsappPlusState,
} from '@/core/sites/whatsapp'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function BusinessTab({
  state,
  onPatch,
}: {
  state: WhatsappPlusState
  onPatch: (data: Partial<import('@/core/sites/whatsapp').WhatsappPlusData>) => void
}) {
  const { t } = useTranslation()
  const d = state.data

  const save = (patch: Partial<WhatsappPlusState['data']>) => void onPatch(patch)

  return (
    <div className="flex flex-col gap-3">
      <Section title={t('sites.whatsapp.business.templates')} focusId="templates">
        <TemplateList
          items={d.templates}
          onChange={(templates) => save({ templates })}
          disabled={!state.enabled}
        />
      </Section>
      <Section title={t('sites.whatsapp.business.smartReplies')}>
        <SmartReplyList items={d.smartReplies} onChange={(smartReplies) => save({ smartReplies })} disabled={!state.enabled} />
      </Section>
      <Section title={t('sites.whatsapp.business.scheduled')}>
        <ScheduledList items={d.scheduled} onChange={(scheduled) => save({ scheduled })} disabled={!state.enabled} />
      </Section>
      <Section title={t('sites.whatsapp.business.tasks')}>
        <TaskList items={d.tasks} onChange={(tasks) => save({ tasks })} disabled={!state.enabled} />
      </Section>
      <Section title={t('sites.whatsapp.business.broadcast')} focusId="broadcast">
        <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-400">{t('sites.whatsapp.broadcast.warning')}</p>
        <BroadcastPanel
          campaigns={d.campaigns}
          onChange={(campaigns) => save({ campaigns })}
          disabled={!state.enabled}
        />
      </Section>
      <Section title={t('sites.whatsapp.business.webhooks')} focusId="webhooks">
        <WebhookList items={d.webhooks} onChange={(webhooks) => save({ webhooks })} disabled={!state.enabled} />
        <p className="mt-2 text-[11px] text-muted-foreground">{t('sites.whatsapp.utilities.unavailable')} (incoming API)</p>
      </Section>
    </div>
  )
}

function Section({ title, children, focusId }: { title: string; children: ReactNode; focusId?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3" data-search-id={focusId}>
      <h3 className="mb-2 text-xs font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function TemplateList({
  items,
  onChange,
  disabled,
}: {
  items: MessageTemplate[]
  onChange: (v: MessageTemplate[]) => void
  disabled: boolean
}) {
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  return (
    <>
      <ul className="mb-2 space-y-1 text-xs">
        {items.map((t) => (
          <li key={t.id} className="flex justify-between gap-2 rounded border px-2 py-1">
            <span className="truncate font-medium">{t.name}</span>
            <button type="button" className="cursor-pointer text-muted-foreground" disabled={disabled} onClick={() => onChange(items.filter((x) => x.id !== t.id))}>
              <Trash2Icon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1.5">
        <Input className="text-xs" placeholder="Name" value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />
        <Input className="text-xs" placeholder="Body with {name}" value={body} disabled={disabled} onChange={(e) => setBody(e.target.value)} />
        <Button type="button" size="sm" disabled={disabled || !name.trim()} onClick={() => {
          onChange([...items, { id: uid(), name, body, createdAt: Date.now() }])
          setName('')
          setBody('')
        }}>
          <PlusIcon className="size-3.5" /> Add
        </Button>
      </div>
    </>
  )
}

function SmartReplyList({ items, onChange, disabled }: { items: SmartReplyRule[]; onChange: (v: SmartReplyRule[]) => void; disabled: boolean }) {
  const [pattern, setPattern] = useState('')
  const [reply, setReply] = useState('')
  return (
    <>
      <ul className="mb-2 space-y-1 text-xs">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span className="truncate">{r.pattern} → {r.reply}</span>
            <Switch checked={r.enabled} disabled={disabled} onCheckedChange={(on) => onChange(items.map((x) => (x.id === r.id ? { ...x, enabled: on } : x)))} />
          </li>
        ))}
      </ul>
      <Input className="mb-1 text-xs" placeholder="Keyword" value={pattern} disabled={disabled} onChange={(e) => setPattern(e.target.value)} />
      <Input className="mb-1 text-xs" placeholder="Reply" value={reply} disabled={disabled} onChange={(e) => setReply(e.target.value)} />
      <Button type="button" size="sm" disabled={disabled || !pattern} onClick={() => {
        onChange([...items, { id: uid(), name: pattern, pattern, isRegex: false, reply, enabled: true, cooldownMinutes: 5, excludeChats: '' }])
        setPattern('')
        setReply('')
      }}>Add rule</Button>
    </>
  )
}

function ScheduledList({ items, onChange, disabled }: { items: ScheduledMessage[]; onChange: (v: ScheduledMessage[]) => void; disabled: boolean }) {
  const [chatId, setChatId] = useState('')
  const [body, setBody] = useState('')
  const [when, setWhen] = useState('')
  return (
    <>
      <ul className="mb-2 text-xs">
        {items.map((s) => (
          <li key={s.id} className="border-b py-1">{s.chatLabel || s.chatId} — {new Date(s.fireAt).toLocaleString()} ({s.status})</li>
        ))}
      </ul>
      <Input className="mb-1 text-xs" placeholder="Chat id" value={chatId} disabled={disabled} onChange={(e) => setChatId(e.target.value)} />
      <Input className="mb-1 text-xs" placeholder="Message" value={body} disabled={disabled} onChange={(e) => setBody(e.target.value)} />
      <Input className="mb-1 text-xs" type="datetime-local" value={when} disabled={disabled} onChange={(e) => setWhen(e.target.value)} />
      <Button type="button" size="sm" disabled={disabled || !chatId || !when} onClick={() => {
        onChange([...items, { id: uid(), chatId, chatLabel: chatId, body, fireAt: new Date(when).getTime(), status: 'pending' }])
      }}>Schedule</Button>
    </>
  )
}

function TaskList({ items, onChange, disabled }: { items: WaTask[]; onChange: (v: WaTask[]) => void; disabled: boolean }) {
  const [title, setTitle] = useState('')
  return (
    <>
      <ul className="mb-2 text-xs">
        {items.map((task) => (
          <li key={task.id} className="flex items-center gap-2 py-1">
            <Switch checked={!task.done} disabled={disabled} onCheckedChange={() => onChange(items.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)))} />
            <span className={task.done ? 'line-through opacity-60' : ''}>{task.title}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input className="text-xs" placeholder="Task title" value={title} disabled={disabled} onChange={(e) => setTitle(e.target.value)} />
        <Button type="button" size="sm" disabled={disabled || !title} onClick={() => {
          onChange([...items, { id: uid(), title, done: false, createdAt: Date.now() }])
          setTitle('')
        }}>Add</Button>
      </div>
    </>
  )
}

function BroadcastPanel({
  campaigns,
  onChange,
  disabled,
}: {
  campaigns: BroadcastCampaign[]
  onChange: (v: BroadcastCampaign[]) => void
  disabled: boolean
}) {
  const [name, setName] = useState('Campaign')
  const [message, setMessage] = useState('Hello {name}')
  const [recipientRef, setRecipientRef] = useState('')
  return (
    <>
      <ul className="mb-2 text-xs">
        {campaigns.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-1">
            <span>{c.name} ({c.sent}/{c.total}) — {c.status}</span>
            {c.status === 'running' ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(campaigns.map((x) => (x.id === c.id ? { ...x, status: 'paused' } : x)))}>Pause</Button>
            ) : c.status === 'draft' || c.status === 'paused' ? (
              <Button type="button" size="sm" onClick={() => {
                const next = campaigns.map((x) => (x.id === c.id ? { ...x, status: 'running' as const } : x))
                onChange(next)
                void sendMessage({ type: 'WA_RUN_BROADCAST', campaignId: c.id })
              }}>Start</Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Input className="mb-1 text-xs" placeholder="Name" value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} />
      <Input className="mb-1 text-xs" placeholder="Recipient chat id" value={recipientRef} disabled={disabled} onChange={(e) => setRecipientRef(e.target.value)} />
      <Input className="mb-1 text-xs" placeholder="Message" value={message} disabled={disabled} onChange={(e) => setMessage(e.target.value)} />
      <Button type="button" size="sm" disabled={disabled || !recipientRef} onClick={() => {
        onChange([...campaigns, {
          id: uid(),
          name,
          message,
          recipientSource: 'csv',
          recipientRef,
          status: 'draft',
          sent: 0,
          total: 1,
          dailyCap: BROADCAST_DAILY_CAP_DEFAULT,
          delayMinSec: 8,
          delayMaxSec: 20,
          workingHoursStart: '09:00',
          workingHoursEnd: '18:00',
          respectWorkingHours: true,
          createdAt: Date.now(),
        }])
      }}>Save campaign</Button>
    </>
  )
}

function WebhookList({ items, onChange, disabled }: { items: WebhookConfig[]; onChange: (v: WebhookConfig[]) => void; disabled: boolean }) {
  const [url, setUrl] = useState('')
  return (
    <>
      <ul className="mb-2 text-xs">
        {items.map((w) => (
          <li key={w.id} className="flex justify-between gap-2 py-1">
            <span className="truncate">{w.url}</span>
            <Switch checked={w.enabled} disabled={disabled} onCheckedChange={(on) => onChange(items.map((x) => (x.id === w.id ? { ...x, enabled: on } : x)))} />
          </li>
        ))}
      </ul>
      <Input className="mb-1 text-xs" placeholder="https://…" value={url} disabled={disabled} onChange={(e) => setUrl(e.target.value)} />
      <Button type="button" size="sm" disabled={disabled || !url} onClick={() => {
        onChange([...items, { id: uid(), url, enabled: true, events: ['message'] }])
        setUrl('')
      }}>Add webhook</Button>
      <Button type="button" size="sm" variant="outline" className="ml-2" disabled={disabled || !url} onClick={() => void sendMessage({ type: 'WA_FIRE_WEBHOOK', event: 'test', payload: { ok: true } })}>Test</Button>
    </>
  )
}
