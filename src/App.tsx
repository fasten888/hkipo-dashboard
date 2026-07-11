import { useEffect, useState } from 'react'
import type { NavigationKey } from './app/navigation'
import { AppShell } from './components/layout/AppShell'
import { usePrivacy } from './hooks/usePrivacy'
import type { DashboardFilter } from './types/dashboardFilter'
import {
  AccountDetailPage,
  AccountsPage,
  AllotmentsPage,
  DashboardPage,
  DataCenterPage,
  DataExportPage,
  DataSafetyPage,
  ExchangePage,
  HoldingsPage,
  IpoDetailPage,
  IposPage,
  MonthlyReviewPage,
  SalesPage,
  StatisticsPage,
  SubscriptionsPage,
  WithdrawalsPage,
} from './pages'

type View =
  | { name: NavigationKey }
  | { name: 'accountDetail'; accountId: string }
  | { name: 'ipoDetail'; ipoId: string }

export default function App() {
  usePrivacy()
  const [view, setView] = useState<View>(readViewFromLocation)
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>({
    accountId: 'all',
    rangePreset: '12m',
    customStartMonth: '',
    customEndMonth: '',
  })
  const activeNavigation: NavigationKey =
    view.name === 'accountDetail'
      ? 'accounts'
      : view.name === 'ipoDetail'
        ? 'ipos'
        : view.name

  useEffect(() => {
    const handleLocationChange = () => setView(readViewFromLocation())
    const handleDataReplaced = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail
      if (
        detail?.reason === 'cloud-force-download' ||
        detail?.reason === 'cloud-conflict-remote'
      ) {
        window.location.hash = '#/subscriptions'
      }
    }
    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('hkipo:app-data-replaced', handleDataReplaced)
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/dashboard')
    }
    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('hkipo:app-data-replaced', handleDataReplaced)
    }
  }, [])

  const navigate = (nextView: View) => {
    const hash = viewToHash(nextView)
    if (window.location.hash === hash) {
      setView(nextView)
      return
    }
    window.location.hash = hash
  }

  return (
    <AppShell
      activeNavigation={activeNavigation}
      onNavigate={(navigation) => navigate({ name: navigation })}
      dashboardFilter={dashboardFilter}
      onDashboardFilterChange={setDashboardFilter}
    >
      {view.name === 'dashboard' && <DashboardPage filter={dashboardFilter} />}
      {view.name === 'accounts' && (
        <AccountsPage
          onViewAccount={(accountId) =>
            navigate({ name: 'accountDetail', accountId })
          }
        />
      )}
      {view.name === 'accountDetail' && (
        <AccountDetailPage
          accountId={view.accountId}
          onBack={() => navigate({ name: 'accounts' })}
        />
      )}
      {view.name === 'deposits' && <WithdrawalsPage />}
      {view.name === 'exchange' && <ExchangePage />}
      {view.name === 'holdings' && <HoldingsPage />}
      {view.name === 'ipos' && (
        <IposPage
          onViewIpo={(ipoId) => navigate({ name: 'ipoDetail', ipoId })}
        />
      )}
      {view.name === 'ipoDetail' && (
        <IpoDetailPage
          ipoId={view.ipoId}
          onBack={() => navigate({ name: 'ipos' })}
        />
      )}
      {view.name === 'subscriptions' && <SubscriptionsPage />}
      {view.name === 'allotments' && <AllotmentsPage />}
      {view.name === 'sales' && <SalesPage />}
      {view.name === 'statistics' && <StatisticsPage />}
      {view.name === 'review' && <MonthlyReviewPage />}
      {view.name === 'dataCenter' && <DataCenterPage />}
      {view.name === 'data' && <DataExportPage />}
      {view.name === 'safety' && <DataSafetyPage />}
      {view.name === 'settings' && <DashboardPage filter={dashboardFilter} />}
    </AppShell>
  )
}

const navigationKeys = new Set<NavigationKey>([
  'dashboard',
  'accounts',
  'deposits',
  'exchange',
  'holdings',
  'ipos',
  'subscriptions',
  'allotments',
  'sales',
  'statistics',
  'review',
  'dataCenter',
  'data',
  'safety',
  'settings',
])

function readViewFromLocation(): View {
  const segments = window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)

  if (segments[0] === 'accounts' && segments[1]) {
    return { name: 'accountDetail', accountId: segments[1] }
  }
  if (segments[0] === 'ipos' && segments[1]) {
    return { name: 'ipoDetail', ipoId: segments[1] }
  }
  if (navigationKeys.has(segments[0] as NavigationKey)) {
    return { name: segments[0] as NavigationKey }
  }
  return { name: 'dashboard' }
}

function viewToHash(view: View) {
  if (view.name === 'accountDetail') {
    return `#/accounts/${encodeURIComponent(view.accountId)}`
  }
  if (view.name === 'ipoDetail') {
    return `#/ipos/${encodeURIComponent(view.ipoId)}`
  }
  return `#/${view.name}`
}
