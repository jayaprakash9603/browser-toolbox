import type { TFunction } from 'i18next'

import type { A11yReportText } from '@/core/engines/a11y'

export function a11yReportText(t: TFunction): A11yReportText {
  return {
    ruleTitle: (id) => t(`a11y.rule.${id}.title`),
    ruleFix: (id) => t(`a11y.rule.${id}.fix`),
  }
}
