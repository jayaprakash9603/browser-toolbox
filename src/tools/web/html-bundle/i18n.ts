import i18n from '@/i18n'
import { htmlBundleCrawlStrings } from '@/i18n/locales/htmlBundleCrawlEn'

// Registered with the lazily loaded tool so the crawl strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', htmlBundleCrawlStrings)
