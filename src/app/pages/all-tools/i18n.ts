import i18n from '@/i18n'
import { allToolsViewerStrings } from '@/i18n/locales/allToolsViewerEn'

// Registered with the lazily loaded All tools page so the strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', allToolsViewerStrings)
