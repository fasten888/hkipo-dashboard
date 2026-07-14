import {
  Bell,
  CalendarRange,
  ChevronDown,
  Cloud,
  CloudOff,
  Download,
  Eye,
  Menu,
  RefreshCw,
  Share,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Brain,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  mainNavigation,
  secondaryNavigation,
  type NavigationItem,
  type NavigationKey,
} from '../../app/navigation'
import { PrivacySettingsModal } from '../privacy/PrivacySettingsModal'
import { Modal } from '../ui/Modal'
import { CloudSyncModal } from '../cloud/CloudSyncModal'
import { useAppData } from '../../hooks/useAppData'
import { APP_VERSION } from '../../app/version'
import { formatAccountName } from '../../utils/account'
import type { DashboardFilter, DashboardRangePreset } from '../../types/dashboardFilter'

interface AppShellProps {
  children: ReactNode
  activeNavigation: NavigationKey
  onNavigate: (navigation: NavigationKey) => void
  dashboardFilter: DashboardFilter
  onDashboardFilterChange: (filter: DashboardFilter) => void
}

export function AppShell({
  children,
  activeNavigation,
  onNavigate,
  dashboardFilter,
  onDashboardFilterChange,
}: AppShellProps) {
  const cloud = useAppData()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen]       = useState(false)
  const [cloudOpen, setCloudOpen]           = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [installPrompt, setInstallPrompt]   = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled]           = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const [openFilter, setOpenFilter]         = useState<'account' | 'range' | null>(null)
  const pageMeta = getPageMeta(activeNavigation)
  const selectedAccount = cloud.accounts.find((account) => account.id === dashboardFilter.accountId)
  const selectedAccountLabel = selectedAccount ? formatAccountName(selectedAccount) : '全部账户'
  const selectedRange = getRangeLabel(dashboardFilter.rangePreset)
  const selectedRangeLabel =
    dashboardFilter.rangePreset === 'custom' && dashboardFilter.customStartMonth && dashboardFilter.customEndMonth
      ? `${dashboardFilter.customStartMonth} 至 ${dashboardFilter.customEndMonth}`
      : selectedRange
  const rangeOptions: Array<{ label: string; value: DashboardRangePreset }> = [
    { label: '近12个月', value: '12m' },
    { label: '近6个月', value: '6m' },
    { label: '近3个月', value: '3m' },
    { label: '自定义', value: 'custom' },
  ]

  useEffect(() => {
    const onPrompt   = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent) }
    const onInstall  = () => { setInstalled(true); setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled',        onInstall)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled',        onInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) { setInstallHelpOpen(true); return }
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  const handleNavigate = (nav: NavigationKey) => { onNavigate(nav); setMobileMenuOpen(false) }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F1ED] text-[#4A4540] lg:flex">

      {/* ── Mobile header ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4DFD6] bg-white px-4 lg:hidden"
        style={{ boxShadow: '0 1px 0 #E4DFD6' }}>
        <Brand />
        <div className="flex items-center gap-1.5">
          <CloudButton connected={Boolean(cloud.cloudUser)} status={cloud.cloudStatus} pending={cloud.cloudPendingChanges} onClick={() => setCloudOpen(true)} compact />
          {!installed && <InstallButton onClick={handleInstall} compact />}
          <button type="button" onClick={() => setMobileMenuOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-[10px] text-[#8C8273] transition hover:bg-[#F4F1ED]">
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* ── Mobile filter bar ── */}
      <section className="sticky top-14 z-20 border-b border-[#E4DFD6] bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative min-w-0">
            <FilterPill
              icon={SlidersHorizontal}
              label={selectedAccountLabel}
              active={openFilter === 'account'}
              onClick={() => setOpenFilter((current) => current === 'account' ? null : 'account')}
              className="h-10 w-full max-w-none justify-between rounded-[12px]"
            />
          </div>
          <div className="relative min-w-0">
            <FilterPill
              icon={CalendarRange}
              label={selectedRangeLabel}
              active={openFilter === 'range'}
              onClick={() => setOpenFilter((current) => current === 'range' ? null : 'range')}
              className="h-10 w-full max-w-none justify-between rounded-[12px]"
            />
          </div>
        </div>

        {openFilter === 'account' && (
          <div className="absolute left-3 right-3 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[16px] border border-[#E4DFD6] bg-white p-1.5 shadow-[0_18px_44px_rgba(74,69,64,0.16)]">
            <button
              type="button"
              onClick={() => {
                onDashboardFilterChange({ ...dashboardFilter, accountId: 'all' })
                setOpenFilter(null)
              }}
              className={[
                'flex h-11 w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium transition',
                dashboardFilter.accountId === 'all'
                  ? 'bg-[#F8F4F1] text-[#B08B7E]'
                  : 'text-[#5A5246] hover:bg-[#F4F1ED]',
              ].join(' ')}
            >
              全部账户
            </button>
            <div className="my-1 h-px bg-[#F0ECE5]" />
            <div className="max-h-[55vh] overflow-y-auto">
              {cloud.accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    onDashboardFilterChange({ ...dashboardFilter, accountId: account.id })
                    setOpenFilter(null)
                  }}
                  className={[
                    'flex w-full flex-col rounded-[12px] px-3 py-2.5 text-left transition',
                    dashboardFilter.accountId === account.id
                      ? 'bg-[#F8F4F1] text-[#B08B7E]'
                      : 'text-[#5A5246] hover:bg-[#F4F1ED]',
                  ].join(' ')}
                >
                  <span className="text-[14px] font-semibold">{formatAccountName(account)}</span>
                  {account.brokerName && (
                    <span className="mt-0.5 text-[11px] font-medium text-[#A8A296]">{account.brokerName}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {openFilter === 'range' && (
          <div className="absolute left-3 right-3 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[16px] border border-[#E4DFD6] bg-white p-1.5 shadow-[0_18px_44px_rgba(74,69,64,0.16)]">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onDashboardFilterChange({ ...dashboardFilter, rangePreset: option.value })
                  if (option.value !== 'custom') setOpenFilter(null)
                }}
                className={[
                  'flex h-11 w-full items-center rounded-[12px] px-3 text-left text-[14px] font-medium transition',
                  dashboardFilter.rangePreset === option.value
                    ? 'bg-[#F8F4F1] text-[#B08B7E]'
                    : 'text-[#5A5246] hover:bg-[#F4F1ED]',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
            {dashboardFilter.rangePreset === 'custom' && (
              <div className="mt-1 rounded-[14px] bg-[#F8F4F1] p-3">
                <p className="mb-2 text-[12px] font-semibold text-[#8C8273]">选择统计月份</p>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-[11px] font-medium text-[#A8A296]">
                    开始月份
                    <input
                      type="month"
                      value={dashboardFilter.customStartMonth}
                      onChange={(event) => onDashboardFilterChange({
                        ...dashboardFilter,
                        customStartMonth: event.target.value,
                      })}
                      className="mt-1 h-10 w-full rounded-[10px] border border-[#E4DFD6] bg-white px-3 text-[14px] font-medium text-[#5A5246] outline-none transition focus:border-[#B08B7E]"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-[#A8A296]">
                    结束月份
                    <input
                      type="month"
                      value={dashboardFilter.customEndMonth}
                      onChange={(event) => onDashboardFilterChange({
                        ...dashboardFilter,
                        customEndMonth: event.target.value,
                      })}
                      className="mt-1 h-10 w-full rounded-[10px] border border-[#E4DFD6] bg-white px-3 text-[14px] font-medium text-[#5A5246] outline-none transition focus:border-[#B08B7E]"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={!dashboardFilter.customStartMonth || !dashboardFilter.customEndMonth}
                  onClick={() => setOpenFilter(null)}
                  className="mt-3 h-10 w-full rounded-[10px] bg-[#B08B7E] text-[14px] font-semibold text-white transition hover:bg-[#9A7468] disabled:cursor-not-allowed disabled:bg-[#D2CBBF]"
                >
                  应用自定义区间
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-[#E4DFD6] bg-white lg:flex"
        style={{ boxShadow: '1px 0 0 #E4DFD6' }}>
        {/* Logo area */}
        <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-[#E4DFD6] px-5">
          <Brand />
        </div>
        <SidebarContent
          activeNavigation={activeNavigation}
          onNavigate={handleNavigate}
          cloud={cloud}
        />
      </aside>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#4A4540]/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)} aria-label="关闭" />
          <aside className="relative flex h-full w-56 flex-col border-r border-[#E4DFD6] bg-white">
            <div className="flex h-14 items-center justify-between border-b border-[#E4DFD6] px-4">
              <Brand />
              <button type="button" onClick={() => setMobileMenuOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-[8px] text-[#A8A296] hover:bg-[#F4F1ED]">
                <X size={16} />
              </button>
            </div>
            <SidebarContent activeNavigation={activeNavigation} onNavigate={handleNavigate} cloud={cloud} />
          </aside>
        </div>
      )}

      {/* ── Main content area ── */}
      <main className="min-w-0 flex-1 lg:ml-56">

        {/* Desktop top header */}
        <header className="sticky top-0 z-20 hidden h-[60px] items-center justify-between gap-4 border-b border-[#E4DFD6] bg-white px-8 lg:flex"
          style={{ boxShadow: '0 1px 0 #E4DFD6' }}>

          {/* Page title */}
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#4A4540]">
              {pageMeta.title}
            </h1>
            <p className="mt-px text-[12px] text-[#A8A296]">{pageMeta.subtitle}</p>
          </div>

          {/* Header controls */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <FilterPill
                icon={SlidersHorizontal}
                label={selectedAccountLabel}
                active={openFilter === 'account'}
                onClick={() => setOpenFilter((current) => current === 'account' ? null : 'account')}
              />
              {openFilter === 'account' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-[14px] border border-[#E4DFD6] bg-white p-1.5 shadow-[0_18px_44px_rgba(74,69,64,0.14)]">
                  <button
                    type="button"
                    onClick={() => {
                      onDashboardFilterChange({ ...dashboardFilter, accountId: 'all' })
                      setOpenFilter(null)
                    }}
                    className={[
                      'flex h-9 w-full items-center rounded-[10px] px-3 text-left text-[12px] font-medium transition',
                      dashboardFilter.accountId === 'all'
                        ? 'bg-[#F8F4F1] text-[#B08B7E]'
                        : 'text-[#5A5246] hover:bg-[#F4F1ED]',
                    ].join(' ')}
                  >
                    全部账户
                  </button>
                  <div className="my-1 h-px bg-[#F0ECE5]" />
                  <div className="max-h-72 overflow-y-auto">
                    {cloud.accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          onDashboardFilterChange({ ...dashboardFilter, accountId: account.id })
                          setOpenFilter(null)
                        }}
                        className={[
                          'flex w-full flex-col rounded-[10px] px-3 py-2 text-left transition',
                          dashboardFilter.accountId === account.id
                            ? 'bg-[#F8F4F1] text-[#B08B7E]'
                            : 'text-[#5A5246] hover:bg-[#F4F1ED]',
                        ].join(' ')}
                      >
                        <span className="text-[12px] font-semibold">{formatAccountName(account)}</span>
                        {account.brokerName && (
                          <span className="mt-0.5 text-[10px] font-medium text-[#A8A296]">{account.brokerName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <FilterPill
                icon={CalendarRange}
                label={selectedRangeLabel}
                active={openFilter === 'range'}
                onClick={() => setOpenFilter((current) => current === 'range' ? null : 'range')}
              />
              {openFilter === 'range' && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-[14px] border border-[#E4DFD6] bg-white p-1.5 shadow-[0_18px_44px_rgba(74,69,64,0.14)]">
                  {rangeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onDashboardFilterChange({ ...dashboardFilter, rangePreset: option.value })
                        if (option.value !== 'custom') setOpenFilter(null)
                      }}
                      className={[
                        'flex h-9 w-full items-center rounded-[10px] px-3 text-left text-[12px] font-medium transition',
                        dashboardFilter.rangePreset === option.value
                          ? 'bg-[#F8F4F1] text-[#B08B7E]'
                          : 'text-[#5A5246] hover:bg-[#F4F1ED]',
                      ].join(' ')}
                    >
                      {option.label}
                    </button>
                  ))}
                  {dashboardFilter.rangePreset === 'custom' && (
                    <div className="mt-1 rounded-[12px] bg-[#F8F4F1] p-3">
                      <p className="mb-2 text-[11px] font-semibold text-[#8C8273]">选择统计月份</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[10px] font-medium text-[#A8A296]">
                          开始月份
                          <input
                            type="month"
                            value={dashboardFilter.customStartMonth}
                            onChange={(event) => onDashboardFilterChange({
                              ...dashboardFilter,
                              customStartMonth: event.target.value,
                            })}
                            className="mt-1 h-8 w-full rounded-[8px] border border-[#E4DFD6] bg-white px-2 text-[12px] font-medium text-[#5A5246] outline-none transition focus:border-[#B08B7E]"
                          />
                        </label>
                        <label className="text-[10px] font-medium text-[#A8A296]">
                          结束月份
                          <input
                            type="month"
                            value={dashboardFilter.customEndMonth}
                            onChange={(event) => onDashboardFilterChange({
                              ...dashboardFilter,
                              customEndMonth: event.target.value,
                            })}
                            className="mt-1 h-8 w-full rounded-[8px] border border-[#E4DFD6] bg-white px-2 text-[12px] font-medium text-[#5A5246] outline-none transition focus:border-[#B08B7E]"
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={!dashboardFilter.customStartMonth || !dashboardFilter.customEndMonth}
                        onClick={() => setOpenFilter(null)}
                        className="mt-3 h-8 w-full rounded-[8px] bg-[#B08B7E] text-[12px] font-semibold text-white transition hover:bg-[#9A7468] disabled:cursor-not-allowed disabled:bg-[#D2CBBF]"
                      >
                        应用自定义区间
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button type="button" onClick={() => void cloud.syncCloudNow()}
              className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#E4DFD6] bg-white text-[#A8A296] transition hover:border-[#D2CBBF] hover:text-[#5A5246]">
              <RefreshCw size={13} className={cloud.cloudStatus === 'syncing' ? 'animate-spin' : ''} />
            </button>

            <CloudButton connected={Boolean(cloud.cloudUser)} status={cloud.cloudStatus} pending={cloud.cloudPendingChanges} onClick={() => setCloudOpen(true)} />
            {!installed && <InstallButton onClick={handleInstall} />}

            {/* Privacy */}
            <button type="button" onClick={() => setPrivacyOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#E4DFD6] bg-white px-3 text-[12px] font-medium text-[#8C8273] transition hover:bg-[#F4F1ED]">
              <Eye size={13} />
              隐私设置
            </button>

            {/* Bell */}
            <button type="button"
              className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#E4DFD6] bg-white text-[#A8A296] transition hover:border-[#D2CBBF] hover:text-[#5A5246]">
              <Bell size={13} />
            </button>

            {/* Avatar */}
            <button type="button"
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#B08B7E] to-[#8E87A6] text-[12px] font-bold text-white"
              aria-label="用户菜单">
              W
            </button>
          </div>
        </header>

        {/* Page body: 页面边距 32px */}
        <div className="page-enter mx-auto max-w-[1540px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>

      <PrivacySettingsModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <CloudSyncModal      open={cloudOpen}   onClose={() => setCloudOpen(false)} />
      <InstallHelpModal    open={installHelpOpen} onClose={() => setInstallHelpOpen(false)} />
    </div>
  )
}

/* ════════════════════════════════════════
   Brand
   ════════════════════════════════════════ */
function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#B08B7E] to-[#8E87A6] text-white shadow-sm">
        <span className="text-[11px] font-black tracking-tight">HK</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight text-[#4A4540]">港新账本</p>
        <p className="text-[9px] font-medium tracking-[0.1em] text-[#A8A296]">PERSONAL INVESTMENT OS</p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Sidebar content
   ════════════════════════════════════════ */
function SidebarContent({
  activeNavigation,
  onNavigate,
  cloud,
}: {
  activeNavigation: NavigationKey
  onNavigate: (nav: NavigationKey) => void
  cloud: ReturnType<typeof useAppData>
}) {
  const allNav = [...mainNavigation, ...secondaryNavigation]

  const groups: Array<{ label: string; ids: NavigationKey[] }> = [
    { label: '驾驶舱',  ids: ['dashboard', 'statistics', 'review'] },
    { label: '新股管理', ids: ['ipos', 'subscriptions', 'allotments', 'sales'] },
    { label: '资金中心', ids: ['accounts', 'deposits', 'exchange', 'holdings'] },
    { label: '系统',    ids: ['dataCenter', 'data', 'safety', 'settings'] },
  ]

  const aiItems = [
    { label: 'AI分析', icon: BarChart3 },
    { label: 'AI建议', icon: Brain },
    { label: 'AI复盘', icon: Settings },
  ]

  const syncLabel =
    cloud.cloudStatus === 'syncing' ? '同步中…'
    : cloud.cloudStatus === 'error'  ? '同步失败'
    : '1 分钟前'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((group) => {
          const items = group.ids
            .map((id) => allNav.find((n) => n.id === id))
            .filter((n): n is NavigationItem => Boolean(n))
          if (!items.length) return null
          return (
            <div key={group.label} className="mb-4">
              {/* Group label */}
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A8A296]">
                {group.label}
              </p>
              {items.map((item) => (
                <NavItem key={item.id} item={item} active={item.id === activeNavigation} onNavigate={onNavigate} />
              ))}
            </div>
          )
        })}

        {/* AI 中心 */}
        <div className="mb-4">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A8A296]">AI中心</p>
          {aiItems.map(({ label, icon: Icon }) => (
            <button key={label} type="button" disabled
              className="flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left text-[13px] text-[#A8A296] cursor-not-allowed">
              <Icon size={14} className="shrink-0 text-[#D2CBBF]" />
              <span className="flex-1">{label}</span>
              <span className="rounded-[4px] bg-[#F4F1ED] px-1.5 py-0.5 text-[9px] font-medium text-[#A8A296]">
                即将上线
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Sidebar footer */}
      <div className="shrink-0 border-t border-[#E4DFD6] px-4 py-4">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#5A5246]">
          <ShieldCheck size={12} className="shrink-0 text-[#7E9587]" />
          {cloud.cloudUser ? '本地 + 云端保护' : '本地数据保护'}
        </div>
        {cloud.cloudUser && (
          <p className="mt-1 truncate text-[11px] text-[#A8A296]">已登录 {cloud.cloudUser.email}，修改后自动同步。</p>
        )}
        {!cloud.cloudUser && (
          <p className="mt-1 text-[11px] text-[#A8A296]">数据保存在当前浏览器。</p>
        )}
        <p className="mt-1 text-[11px] text-[#A8A296]">最后同步: {syncLabel}</p>
        <p className="mt-3 text-[11px] font-medium text-[#D2CBBF]">v{APP_VERSION}</p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Nav item
   ════════════════════════════════════════ */
function NavItem({
  item, active, onNavigate,
}: {
  item: NavigationItem
  active: boolean
  onNavigate: (nav: NavigationKey) => void
}) {
  const { id, label, icon: Icon, available } = item
  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => onNavigate(id)}
      className={[
        'group flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left text-[13px] font-medium transition-all duration-100',
        active
          ? 'bg-[#F8F4F1] font-semibold text-[#B08B7E]'
          : available
          ? 'text-[#5A5246] hover:bg-[#F4F1ED] hover:text-[#4A4540]'
          : 'cursor-not-allowed text-[#A8A296]',
      ].join(' ')}
    >
      <Icon
        size={14}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? 'text-[#B08B7E]' : 'text-[#A8A296] group-hover:text-[#8C8273]'}
      />
      <span className="flex-1 leading-none">{label}</span>
      {!available && (
        <span className="rounded-[4px] bg-[#F4F1ED] px-1.5 py-0.5 text-[9px] text-[#A8A296]">soon</span>
      )}
    </button>
  )
}

/* ════════════════════════════════════════
   Header sub-components
   ════════════════════════════════════════ */
function FilterPill({
  icon: Icon,
  label,
  active = false,
  onClick,
  className,
}: {
  icon: LucideIcon
  label: string
  active?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={[
        'inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-[8px] border bg-white px-3 text-[12px] font-medium text-[#5A5246] transition hover:bg-[#F4F1ED] hover:border-[#D2CBBF]',
        active ? 'border-[#D2CBBF] bg-[#F8F4F1]' : 'border-[#E4DFD6]',
        className ?? '',
      ].join(' ')}
    >
      <Icon size={13} className="text-[#A8A296]" />
      <span className="truncate">{label}</span>
      <ChevronDown size={12} className={['shrink-0 text-[#D2CBBF] transition', active ? 'rotate-180' : ''].join(' ')} />
    </button>
  )
}

function CloudButton({
  connected, status, pending, compact = false, onClick,
}: {
  connected: boolean
  status: ReturnType<typeof useAppData>['cloudStatus']
  pending: boolean
  compact?: boolean
  onClick: () => void
}) {
  const Icon      = connected ? Cloud : CloudOff
  const syncing   = status === 'syncing' || status === 'loading'
  const hasProblem = status === 'error' || status === 'offline' || status === 'auth_expired'
  const label     = !connected ? '云同步'
    : syncing ? '同步中'
    : pending ? '待上传'
    : hasProblem ? '同步异常'
    : '已同步'

  return (
    <button type="button" onClick={onClick}
      className={[
        'inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-medium transition',
        hasProblem          ? 'border-[#F3EAD7] bg-[#FAF6EF] text-[#9F814C]'
        : connected && pending ? 'border-[#E8D9D3] bg-[#F8F4F1] text-[#B08B7E]'
        : connected            ? 'border-[#E5EBE5] bg-[#F2F5F2] text-[#677A6F]'
        :                        'border-[#E4DFD6] bg-white text-[#8C8273]',
      ].join(' ')}>
      <Icon size={13} className={syncing ? 'animate-pulse' : ''} />
      {!compact && label}
    </button>
  )
}

function InstallButton({ compact = false, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[#B08B7E] px-3 text-[12px] font-semibold text-white transition hover:bg-[#9A7468]"
      style={{ boxShadow: '0 1px 3px rgba(37,99,235,0.25)' }}>
      <Download size={13} />
      {!compact && '安装应用'}
    </button>
  )
}

function InstallHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="安装到手机桌面" description="请先用手机浏览器打开部署后的网址。" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-[10px] bg-[#F4F1ED] p-4">
          <p className="text-[13px] font-semibold text-[#4A4540]">iPhone / iPad</p>
          <p className="mt-2 flex items-start gap-2 text-[12px] leading-5 text-[#8C8273]">
            <Share size={14} className="mt-0.5 shrink-0 text-[#B08B7E]" />
            使用 Safari 打开网址，点击底部"分享"，再选择"添加到主屏幕"。
          </p>
        </div>
        <div className="rounded-[10px] bg-[#F4F1ED] p-4">
          <p className="text-[13px] font-semibold text-[#4A4540]">Android</p>
          <p className="mt-2 text-[12px] leading-5 text-[#8C8273]">
            使用 Chrome 打开网址，点击浏览器菜单中的"安装应用"或"添加到主屏幕"。
          </p>
        </div>
        <p className="text-[11px] leading-5 text-[#9F814C]">
          登录同一个云同步账号后，电脑和手机会共享数据；未登录时仍使用本机存储。
        </p>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════
   Page meta
   ════════════════════════════════════════ */
function getPageMeta(nav: NavigationKey) {
  const map: Record<NavigationKey, { title: string; subtitle: string }> = {
    dashboard:     { title: '投资驾驶舱',  subtitle: '看收益、再判断风险，最后决定下一步该做什么。' },
    planner:       { title: '资金分配',   subtitle: '为本轮新股选择账户、识别冲突并生成申购计划。' },
    accounts:      { title: '账户管理',   subtitle: '识别最赚钱、最高效、最值得继续投入的账户。' },
    deposits:      { title: '出金管理',   subtitle: '追踪净入金、出金和真实收益。' },
    exchange:      { title: '换汇管理',   subtitle: '记录真实成交汇率和年度汇率损益。' },
    holdings:      { title: '持仓管理',   subtitle: '管理持仓市值、抵押率和打新能力。' },
    ipos:          { title: '新股资料',   subtitle: '管理 IPO 基础信息、行业和上市节奏。' },
    subscriptions: { title: '申购记录',   subtitle: '以申购记录为核心追踪参与、中签和收益。' },
    allotments:    { title: '中签管理',   subtitle: '批量录入结果，观察命中率结构。' },
    sales:         { title: '卖出记录',   subtitle: '记录暗盘、首日和持有后卖出的净收益。' },
    statistics:    { title: '数据统计',   subtitle: '用排行、趋势和策略分析复盘打新表现。' },
    review:        { title: '月度复盘',   subtitle: '按月份回看参与、中签、收益和最佳新股。' },
    dataCenter:    { title: '数据中心',   subtitle: '查看 IPO 同步、Provider 状态和导入入口。' },
    data:          { title: '数据管理',   subtitle: '导入导出、备份恢复和迁移数据。' },
    safety:        { title: '数据安全',   subtitle: '操作日志、版本快照和数据健康检查。' },
    settings:      { title: '设置中心',   subtitle: '配置你的个人投资驾驶舱。' },
  }
  return map[nav]
}

function getRangeLabel(preset: DashboardRangePreset) {
  const labels: Record<DashboardRangePreset, string> = {
    '12m': '近12个月',
    '6m': '近6个月',
    '3m': '近3个月',
    custom: '自定义',
  }
  return labels[preset]
}
