import type { Account } from '../types/account'
import type {
  Subscription,
  SubscriptionMethod,
} from '../types/subscription'

export const SUBSCRIPTION_METHOD_OPTIONS: {
  value: SubscriptionMethod
  label: string
}[] = [
  { value: 'cash', label: '现金' },
  { value: '10x', label: '10x融资' },
]

export function normalizeSubscriptionMethod(
  value: unknown,
): SubscriptionMethod {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (
      normalized === 'cash' ||
      normalized === '0' ||
      normalized.includes('现金')
    ) {
      return 'cash'
    }
  }
  if (value === 0 || value === 1) return 'cash'
  return '10x'
}

export function getAccountDefaultSubscriptionMethod(
  account: Pick<Account, 'defaultSubscriptionMethod'> | undefined,
): SubscriptionMethod {
  return normalizeSubscriptionMethod(account?.defaultSubscriptionMethod)
}

export function getSubscriptionMethod(
  subscription:
    | Pick<Subscription, 'subscriptionMethod' | 'method'>
    | undefined,
  account?: Pick<Account, 'defaultSubscriptionMethod'>,
): SubscriptionMethod {
  return normalizeSubscriptionMethod(
    subscription?.subscriptionMethod ??
      subscription?.method ??
      getAccountDefaultSubscriptionMethod(account),
  )
}

export function getSubscriptionMethodLabel(method: SubscriptionMethod) {
  return (
    SUBSCRIPTION_METHOD_OPTIONS.find((option) => option.value === method)
      ?.label ?? method
  )
}
