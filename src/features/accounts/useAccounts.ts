import { useMemo } from 'react'
import { useAppData } from '../../hooks/useAppData'

export function useAccounts() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useAppData()
  const summary = useMemo(
    () =>
      accounts.reduce(
        (total, account) => ({
          initialDeposit: total.initialDeposit + account.initialDeposit,
          currentAssets: total.currentAssets + account.currentAssets,
        }),
        { initialDeposit: 0, currentAssets: 0 },
      ),
    [accounts],
  )

  return {
    accounts,
    summary,
    addAccount,
    updateAccount,
    deleteAccount,
  }
}
