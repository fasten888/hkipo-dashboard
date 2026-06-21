import { useAppData } from '../../hooks/useAppData'
import type { SubscriptionInput } from '../../types/subscription'

export function useSubscriptions() {
  const {
    subscriptions,
    addSubscriptions,
    updateSubscription,
    deleteSubscription,
  } = useAppData()
  return {
    subscriptions,
    addSubscription: (input: SubscriptionInput) => addSubscriptions([input]),
    addSubscriptions,
    updateSubscription,
    deleteSubscription,
  }
}
