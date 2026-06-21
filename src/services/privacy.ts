export const PRIVACY_STORAGE_KEY = 'hkipo-dashboard:privacy-settings:v2'
const LEGACY_PRIVACY_STORAGE_KEY = 'hkipo-dashboard:privacy-mode'

export interface PrivacySettings {
  accountName: boolean
  accountSuffix: boolean
  amount: boolean
  profit: boolean
  profitRate: boolean
  investment: boolean
  accountRanking: boolean
  ipoRanking: boolean
  dashboardKpi: boolean
}

export type PrivacyField = keyof PrivacySettings
export type MoneyPrivacyKind = 'amount' | 'profit' | 'investment'

export const VISIBLE_PRIVACY_SETTINGS: PrivacySettings = {
  accountName: false,
  accountSuffix: false,
  amount: false,
  profit: false,
  profitRate: false,
  investment: false,
  accountRanking: false,
  ipoRanking: false,
  dashboardKpi: false,
}

export const HIDDEN_PRIVACY_SETTINGS: PrivacySettings = {
  accountName: true,
  accountSuffix: true,
  amount: true,
  profit: true,
  profitRate: true,
  investment: true,
  accountRanking: true,
  ipoRanking: true,
  dashboardKpi: true,
}

export const AMOUNT_ONLY_PRIVACY_SETTINGS: PrivacySettings = {
  ...VISIBLE_PRIVACY_SETTINGS,
  amount: true,
  profit: true,
  profitRate: true,
  investment: true,
}

function loadPrivacySettings(): PrivacySettings {
  try {
    const stored = window.localStorage.getItem(PRIVACY_STORAGE_KEY)
    if (stored) {
      return {
        ...VISIBLE_PRIVACY_SETTINGS,
        ...(JSON.parse(stored) as Partial<PrivacySettings>),
      }
    }
    const legacyEnabled =
      window.localStorage.getItem(LEGACY_PRIVACY_STORAGE_KEY) === 'true'
    return legacyEnabled
      ? { ...HIDDEN_PRIVACY_SETTINGS }
      : { ...VISIBLE_PRIVACY_SETTINGS }
  } catch {
    return { ...VISIBLE_PRIVACY_SETTINGS }
  }
}

let privacySettings =
  typeof window === 'undefined'
    ? { ...VISIBLE_PRIVACY_SETTINGS }
    : loadPrivacySettings()

export function getPrivacySettings() {
  return privacySettings
}

export function setPrivacySettings(settings: PrivacySettings) {
  privacySettings = settings
  try {
    window.localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(settings))
    window.localStorage.removeItem(LEGACY_PRIVACY_STORAGE_KEY)
  } catch {
    // Privacy controls remain active for the current session.
  }
}

export function isPrivacyFieldHidden(field: PrivacyField) {
  return privacySettings[field]
}

export function shouldHideMoney(kind: MoneyPrivacyKind) {
  return privacySettings[kind]
}
