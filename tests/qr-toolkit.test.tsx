import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import {
  buildEventPayload,
  buildGeoPayload,
  buildSmsPayload,
  createQrMatrix,
  parseQrContent,
} from '@/core/engines/qrcode'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import QrToolkitTool from '@/tools/generators/qr-toolkit/Tool'
import {
  DEFAULT_STYLE,
  EMPTY_FORM,
  buildQrGeometry,
  buildQrPayload,
  buildQrSvg,
  parsedToForm,
  scanRisk,
  type QrForm,
} from '@/tools/generators/qr-toolkit/qrModel'
import type { QrPreset } from '@/core/engines/qrcode'
import { resetChromeMockStorage } from './setup'

registerModules()

describe('qr payload builders', () => {
  it('builds sms, geo and event payloads', () => {
    expect(buildSmsPayload({ phone: '+1 (555) 010', message: 'Hi' })).toBe('SMSTO:+1555010:Hi')
    expect(buildSmsPayload({ phone: '555' })).toBe('SMSTO:555')
    expect(buildGeoPayload({ lat: '48.8584', lng: '2.2945' })).toBe('geo:48.8584,2.2945')
    expect(buildGeoPayload({ lat: '91', lng: '0' })).toBeNull()
    expect(buildGeoPayload({ lat: 'abc', lng: '0' })).toBeNull()
    const event = buildEventPayload({ title: 'Launch; party', start: '2026-10-24T09:30', location: 'Room 1, HQ' })
    expect(event).toContain('SUMMARY:Launch\\; party')
    expect(event).toContain('DTSTART:20261024T093000')
    expect(event).toContain('LOCATION:Room 1\\, HQ')
  })

  it('returns an empty payload until required fields are filled', () => {
    expect(buildQrPayload('wifi', EMPTY_FORM)).toBe('')
    expect(buildQrPayload('contact', EMPTY_FORM)).toBe('')
    expect(buildQrPayload('geo', { ...EMPTY_FORM, lat: '1' })).toBe('')
    expect(buildQrPayload('url', { ...EMPTY_FORM, url: 'example.com' })).toBe('https://example.com')
  })
})

describe('decoded content round-trips into the generator', () => {
  const cases: [QrPreset, Partial<QrForm>][] = [
    ['wifi', { ssid: 'My;Net', password: 'p:ss', encryption: 'WEP', hidden: true }],
    ['email', { emailTo: 'a@b.co', emailSubject: 'Hi there', emailBody: 'Line' }],
    ['phone', { phone: '+15551234' }],
    ['sms', { smsPhone: '+15551234', smsMessage: 'See you: soon' }],
    ['contact', { firstName: 'Ada', lastName: 'Lovelace', contactPhone: '+1555', contactEmail: 'ada@x.io', organization: 'AE' }],
    ['geo', { lat: '48.8584', lng: '2.2945' }],
    ['event', { eventTitle: 'Launch, v2', eventStart: '2026-10-24T09:30', eventEnd: '2026-10-24T11:00', eventLocation: 'HQ' }],
    ['url', { url: 'https://example.com/a?b=1' }],
    ['text', { text: 'hello world' }],
  ]

  it.each(cases)('%s', (preset, fields) => {
    const payload = buildQrPayload(preset, { ...EMPTY_FORM, ...fields })
    const parsed = parseQrContent(payload)
    expect(parsed.kind).toBe(preset)
    expect(parsedToForm(parsed)).toMatchObject(fields)
  })
})

describe('qr geometry', () => {
  it('draws body, three eyes, logo hole and caption band', async () => {
    const result = await createQrMatrix('https://example.com', 'H')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const matrix = result.value
    expect(matrix.size).toBe(matrix.version * 4 + 17)

    const plain = buildQrGeometry(matrix, DEFAULT_STYLE, false)
    expect(plain.width).toBe(matrix.size + DEFAULT_STYLE.margin * 2)
    expect(plain.height).toBe(plain.width)
    expect(plain.eyes).toHaveLength(3)
    expect(plain.body.length).toBeGreaterThan(0)

    const styled = buildQrGeometry(
      matrix,
      { ...DEFAULT_STYLE, moduleShape: 'dots', showLabel: true, label: 'Scan <me>' },
      true,
    )
    expect(styled.logo).not.toBeNull()
    expect(styled.height).toBeGreaterThan(styled.width)
    const svg = buildQrSvg(styled, { ...DEFAULT_STYLE, gradient: 'linear', showLabel: true, label: 'Scan <me>' }, 'data:image/png;base64,AA')
    expect(svg).toContain('<linearGradient id="qr-ink"')
    expect(svg).toContain('Scan &#60;me&#62;')
    expect(svg).toContain('<image href="data:image/png;base64,AA"')
  })

  it('flags styles that are hard to scan', () => {
    expect(scanRisk(DEFAULT_STYLE)).toBe('ok')
    expect(scanRisk({ ...DEFAULT_STYLE, fg: '#cccccc' })).toBe('lowContrast')
    expect(scanRisk({ ...DEFAULT_STYLE, fg: '#ffffff', bg: '#000000' })).toBe('inverted')
    expect(scanRisk({ ...DEFAULT_STYLE, fg: '#ffffff', transparent: true })).toBe('ok')
  })
})

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <QrToolkitTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  resetChromeMockStorage()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => cleanup())

describe('QR toolkit UI', () => {
  it('generates a code from text and reports its size', async () => {
    renderTool()
    expect(screen.getByText('Your code appears here')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /content/i }), { target: { value: 'hello' } })
    await waitFor(() => expect(screen.getByRole('img', { name: 'QR code' })).toBeInTheDocument(), {
      timeout: 8000,
    })
    expect(screen.getByRole('status')).toHaveTextContent(/Version 1 · 21×21 modules · 5 bytes/)
    expect(screen.getByRole('button', { name: 'PNG' })).toBeEnabled()
  }, 15000)

  it('switches content type and shows its fields', async () => {
    renderTool()
    fireEvent.click(screen.getByRole('radio', { name: 'Wi-Fi' }))
    expect(await screen.findByLabelText('Network name (SSID)')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /hidden network/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Event' }))
    expect(await screen.findByLabelText('Event title')).toBeInTheDocument()
  })

  it('applies a colour theme and persists the design', async () => {
    renderTool()
    const ocean = screen.getByRole('radio', { name: 'Ocean' })
    fireEvent.click(ocean)
    expect(ocean).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(localStorage.getItem('qr-toolkit:style')).toContain('#4f46e5'))
  })
})
