import i18n from '@/i18n'
import { bookmarksStrings } from '@/i18n/locales/bookmarksEn'

// Registered with the lazily loaded tool so the strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', bookmarksStrings)
