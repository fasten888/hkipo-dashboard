import type { Account } from '../types/account'
import {
  isPrivacyFieldHidden,
  type PrivacySettings,
} from '../services/privacy'

export function formatAccountName(
  account: Pick<Account, 'name' | 'accountSuffix'> | undefined,
  settings?: Pick<PrivacySettings, 'accountName' | 'accountSuffix'>,
) {
  if (!account) return '-'
  const hideName =
    settings?.accountName ?? isPrivacyFieldHidden('accountName')
  const hideSuffix =
    settings?.accountSuffix ?? isPrivacyFieldHidden('accountSuffix')
  const name = hideName
    ? `${account.name.slice(0, 1) || '账'}**`
    : account.name
  const rawSuffix = account.accountSuffix?.trim() ?? ''
  if (!rawSuffix) return name
  const suffix = hideSuffix ? '****' : rawSuffix
  return `${name}（${suffix}）`
}

export function formatAccountNamePlain(
  account: Pick<Account, 'name' | 'accountSuffix'> | undefined,
) {
  return formatAccountName(account, {
    accountName: false,
    accountSuffix: false,
  })
}

export function formatAccountSuffix(value: string) {
  return isPrivacyFieldHidden('accountSuffix') ? '****' : value
}

export function formatSensitiveText(value: string) {
  return value
}
