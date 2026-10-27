import i18n from '@/i18n'
import { demoStrings } from '@/i18n/locales/demoEn'

// Registered with the lazily loaded demo chunks so the strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', demoStrings)
