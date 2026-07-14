import { useEffect, useState } from 'react'
import type { NavigationKey } from './app/navigation'
import { AppShell } from './components/layout/AppShell'
import { usePrivacy } from './hooks/usePrivacy'
import type { DashboardFilter } from './types/dashboardFilter'
import {
  AccountDetailPage,
  AccountsPage,
  AllotmentsPage,
  CapitalAllocationPage,
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
  | { name: 'ipoDetail'; ipoCode: string }

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
    window.addEventListener('popstate', handleLocationChange)
    window.addEventListener('hkipo:app-data-replaced', handleDataReplaced)
    if (!window.location.hash && !isDirectIpoRoute()) {
      window.history.replaceState(null, '', '#/dashboard')
    }
    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
      window.removeEventListener('hkipo:app-data-replaced', handleDataReplaced)
    }
  }, [])

  const navigate = (nextView: View) => {
    const url = viewToUrl(nextView)
    const currentUrl = `${window.location.pathname}${window.location.hash}`
    if (currentUrl === url) {
      setView(nextView)
      return
    }
    window.history.pushState(null, '', url)
    setView(nextView)
  }

  return (
    <AppShell
      activeNavigation={activeNavigation}
      onNavigate={(navigation) => navigate({ name: navigation })}
      dashboardFilter={dashboardFilter}
      onDashboardFilterChange={setDashboardFilter}
    >
      {view.name === 'dashboard' && <DashboardPage filter={dashboardFilter} />}
      {view.name === 'planner' && <CapitalAllocationPage />}
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
          onViewIpo={(ipoCode) => navigate({ name: 'ipoDetail', ipoCode })}
        />
      )}
      {view.name === 'ipoDetail' && (
        <IpoDetailPage
          ipoCode={view.ipoCode}
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
  'planner',
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
  const hashSegments = parseSegments(window.location.hash.replace(/^#\/?/, ''))

  if (hashSegments[0] === 'accounts' && hashSegments[1]) {
    return { name: 'accountDetail', accountId: hashSegments[1] }
  }
  if ((hashSegments[0] === 'ipos' || hashSegments[0] === 'ipo') && hashSegments[1]) {
    return { name: 'ipoDetail', ipoCode: hashSegments[1] }
  }
  if (navigationKeys.has(hashSegments[0] as NavigationKey)) {
    return { name: hashSegments[0] as NavigationKey }
  }

  const pathSegments = parseSegments(window.location.pathname)
  if (pathSegments[0] === 'ipo' && pathSegments[1]) {
    return { name: 'ipoDetail', ipoCode: pathSegments[1] }
  }
  return { name: 'dashboard' }
}

function parseSegments(value: string) {
  return value
    .replace(/^\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

function isDirectIpoRoute() {
  const pathSegments = parseSegments(window.location.pathname)
  return pathSegments[0] === 'ipo' && Boolean(pathSegments[1])
}

function viewToUrl(view: View) {
  if (view.name === 'accountDetail') {
    return `/#/accounts/${encodeURIComponent(view.accountId)}`
  }
  if (view.name === 'ipoDetail') {
    return `/ipo/${encodeURIComponent(view.ipoCode)}`
  }
  return `/#/${view.name}`
}
