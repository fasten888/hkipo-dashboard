import {
  isPrivacyFieldHidden,
  shouldHideMoney,
  type MoneyPrivacyKind,
} from '../services/privacy'

const hkdFormatter = new Intl.NumberFormat('zh-HK', {
  style: 'currency',
  currency: 'HKD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatHKD(
  value: number,
  kind: MoneyPrivacyKind = 'amount',
  scope?: 'dashboardKpi',
) {
  if (
    shouldHideMoney(kind) ||
    (scope === 'dashboardKpi' && isPrivacyFieldHidden('dashboardKpi'))
  ) {
    return 'HK$ ••••••'
  }
  return hkdFormatter.format(value).replace('HK$', 'HK$ ')
}

export function formatSignedHKD(
  value: number,
  kind: MoneyPrivacyKind = 'amount',
) {
  const formatted = formatHKD(value, kind)
  return formatted.includes('•')
    ? formatted
    : `${value > 0 ? '+' : ''}${formatted}`
}

export function formatPercent(
  value: number,
  kind: 'rate' | 'profitRate' = 'rate',
  scope?: 'dashboardKpi',
) {
  if (
    (kind === 'profitRate' && isPrivacyFieldHidden('profitRate')) ||
    (scope === 'dashboardKpi' && isPrivacyFieldHidden('dashboardKpi'))
  ) {
    return '**%'
  }
  return `${value.toFixed(1)}%`
}

export function formatSignedPercent(value: number) {
  const formatted = formatPercent(value, 'profitRate')
  return formatted.includes('*')
    ? formatted
    : `${value > 0 ? '+' : ''}${formatted}`
}
