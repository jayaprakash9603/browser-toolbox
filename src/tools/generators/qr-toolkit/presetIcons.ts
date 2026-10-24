import {
  CalendarDaysIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PhoneIcon,
  TypeIcon,
  UserRoundIcon,
  WifiIcon,
} from 'lucide-react'

import type { QrPreset } from '@/core/engines/qrcode'

export const PRESET_ICONS: Record<QrPreset, typeof TypeIcon> = {
  text: TypeIcon,
  url: LinkIcon,
  wifi: WifiIcon,
  email: MailIcon,
  phone: PhoneIcon,
  sms: MessageSquareTextIcon,
  contact: UserRoundIcon,
  geo: MapPinIcon,
  event: CalendarDaysIcon,
}
