import { AccountDetailPage as AccountDetailFeature } from '../features/accounts/AccountDetailPage'

export function AccountDetailPage({
  accountId,
  onBack,
}: {
  accountId: string
  onBack: () => void
}) {
  return <AccountDetailFeature accountId={accountId} onBack={onBack} />
}
