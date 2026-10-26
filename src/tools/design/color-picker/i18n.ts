import i18n from '@/i18n'
import { colorPickerStrings } from '@/i18n/locales/colorPickerEn'

// Registered with the lazily loaded tool so the strings stay out of the side panel boot bundle.
i18n.addResources('en', 'translation', colorPickerStrings)
