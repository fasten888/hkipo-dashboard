import { AccountsPage as AccountsFeature } from '../features/accounts/AccountsPage'

export function AccountsPage({
  onViewAccount,
}: {
  onViewAccount: (accountId: string) => void
}) {
  return <AccountsFeature onViewAccount={onViewAccount} />
}
