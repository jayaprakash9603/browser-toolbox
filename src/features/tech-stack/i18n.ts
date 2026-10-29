import i18n from '@/i18n'
import { techStackStrings } from '@/i18n/locales/techStackEn'

// Registered with the lazily loaded panel so the strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', techStackStrings)
