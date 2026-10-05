import { useEffect } from 'react'
import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'

import en from '@/i18n/locales/en'

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en'],
  resources: { en: { translation: en } },
  keySeparator: false,
  interpolation: { escapeValue: false },
})

export function DocumentLanguage() {
  const { i18n: instance, t } = useTranslation()

  useEffect(() => {
    document.documentElement.lang = instance.resolvedLanguage ?? 'en'
    document.title = t('document.title')
  }, [instance, t])

  return null
}

export default i18n
