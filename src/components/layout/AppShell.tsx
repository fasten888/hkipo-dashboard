import {
  BellIcon,
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

interface AppShellProps {
  children: ReactNode
  activeNavigation: NavigationKey
  onNavigate: (navigation: NavigationKey) => void
}

export function AppShell({
  children,
  activeNavigation,
  onNavigate,
}: AppShellProps) {
  const cloud = useAppData()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [cloudOpen, setCloudOpen] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches,
  )
  const pageMeta = getPageMeta(activeNavigation)

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) {
      setInstallHelpOpen(true)
      return
    }
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

  const handleNavigate = (navigation: NavigationKey) => {
    onNavigate(navigation)
    setMobileMenuOpen(false)
  }

  const handleRefresh = () => {
    void cloud.syncCloudNow()
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F0F2F8] text-slate-950 lg:flex">
      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white px-3 shadow-sm sm:px-4 lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <CloudButton
            connected={Boolean(cloud.cloudUser)}
            status={cloud.cloudStatus}
            pending={cloud.cloudPendingChanges}
            onClick={() => setCloudOpen(true)}
            compact
          />
          {!installed && <InstallButton onClick={handleInstall} compact />}
          <PrivacyButton onClick={() => setPrivacyOpen(true)} compact />
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="打开导航"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[210px] flex-col bg-white text-slate-700 shadow-[1px_0_0_#E8EAF0] lg:flex">
        {/* Logo */}
        <div className="flex h-[60px] items-center gap-3 border-b border-slate-100 px-5">
          <Brand />
        </div>
        <SidebarContent
          activeNavigation={activeNavigation}
          onNavigate={handleNavigate}
          cloudUser={cloud.cloudUser}
          cloudStatus={cloud.cloudStatus}
        />
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="关闭导航"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-[210px] flex-col bg-white text-slate-700 shadow-modal">
            <div className="flex h-14 items-center justify-between px-4 border-b border-slate-100">
              <Brand />
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              activeNavigation={activeNavigation}
              onNavigate={handleNavigate}
              cloudUser={cloud.cloudUser}
              cloudStatus={cloud.cloudStatus}
            />
          </aside>
        </div>
      )}

      {/* ── Main ── */}
      <main className="min-w-0 flex-1 lg:ml-[210px]">
        {/* Desktop header */}
        <div className="sticky top-0 z-20 hidden h-[60px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-6 shadow-sm lg:flex">
          {/* Left: page title + subtitle */}
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.01em] text-[#1a1a2e]">
              {pageMeta.title}
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {pageMeta.subtitle}
            </p>
          </div>

          {/* Right: controls */}
          <div className="flex shrink-0 items-center gap-2">
            <HeaderPill icon={SlidersHorizontal} label="全部账户" />
            <HeaderPill icon={CalendarRange} label="近12个月" />
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="刷新同步"
              onClick={handleRefresh}
            >
              <RefreshCw
                size={14}
                className={cloud.cloudStatus === 'syncing' ? 'animate-spin' : undefined}
              />
            </button>
            <CloudButton
              connected={Boolean(cloud.cloudUser)}
              status={cloud.cloudStatus}
              pending={cloud.cloudPendingChanges}
              onClick={() => setCloudOpen(true)}
            />
            {!installed && <InstallButton onClick={handleInstall} />}
            <PrivacyButton onClick={() => setPrivacyOpen(true)} />
            {/* Bell */}
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="通知"
            >
              <BellIcon size={14} />
            </button>
            {/* Avatar */}
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-[13px] font-bold text-white shadow-sm"
              aria-label="用户菜单"
            >
              W
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="page-enter mx-auto min-w-0 max-w-[1600px] px-6 py-6">
          {children}
        </div>
      </main>

      <PrivacySettingsModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <CloudSyncModal open={cloudOpen} onClose={() => setCloudOpen(false)} />
      <InstallHelpModal open={installHelpOpen} onClose={() => setInstallHelpOpen(false)} />
    </div>
  )
}

// ─────────────────────────────────────────────
// Brand
// ─────────────────────────────────────────────
function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#4F6EF7] to-[#7C3AED] text-white shadow-md shadow-indigo-500/30">
        <span className="text-[13px] font-black tracking-tight">HK</span>
      </div>
      <div>
        <p className="text-[14px] font-bold leading-tight text-[#1a1a2e]">港新账本</p>
        <p className="text-[9px] font-medium tracking-[0.1em] text-slate-400">PERSONAL INVESTMENT OS</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sidebar content
// ─────────────────────────────────────────────
function SidebarContent({
  activeNavigation,
  onNavigate,
  cloudUser,
  cloudStatus,
}: {
  activeNavigation: NavigationKey
  onNavigate: (navigation: NavigationKey) => void
  cloudUser: ReturnType<typeof useAppData>['cloudUser']
  cloudStatus: ReturnType<typeof useAppData>['cloudStatus']
}) {
  const allNavigation = [...mainNavigation, ...secondaryNavigation]

  const navigationGroups: Array<{ label: string; ids: NavigationKey[] }> = [
    { label: '驾驶舱', ids: ['dashboard', 'statistics', 'review'] },
    { label: '新股管理', ids: ['ipos', 'subscriptions', 'allotments', 'sales'] },
    { label: '资金中心', ids: ['accounts', 'deposits', 'exchange', 'holdings'] },
    { label: '系统', ids: ['data', 'safety', 'settings'] },
  ]

  // AI Center - static display (coming soon)
  const aiItems = [
    { label: 'AI分析', available: false },
    { label: 'AI建议', available: false },
    { label: 'AI复盘', available: false },
  ]

  const lastSyncText = cloudStatus === 'syncing'
    ? '同步中…'
    : cloudStatus === 'synced'
    ? '1 分钟前'
    : cloudStatus === 'error'
    ? '同步失败'
    : '刚刚'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigationGroups.map((group) => {
          const items = group.ids
            .map((id) => allNavigation.find((item) => item.id === id))
            .filter((item): item is NavigationItem => Boolean(item))
          if (items.length === 0) return null
          return (
            <div key={group.label} className="mb-1">
              <p className="mb-1 px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {group.label}
              </p>
              {items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={item.id === activeNavigation}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )
        })}

        {/* AI Center group */}
        <div className="mb-1">
          <p className="mb-1 px-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            AI中心
          </p>
          {aiItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-slate-400 cursor-not-allowed"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              {item.label}
              <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                即将上线
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
          <span className="font-medium">
            {cloudUser ? '本地 + 云端保护' : '本地数据保护'}
          </span>
        </div>
        {cloudUser && (
          <p className="mt-1 text-[11px] text-slate-400 leading-5">
            已登录 {cloudUser.email}
          </p>
        )}
        <p className="mt-1 text-[11px] text-slate-400">
          最后同步: {lastSyncText}
        </p>
        <p className="mt-3 text-[11px] font-medium text-slate-300">
          v{APP_VERSION}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Nav item
// ─────────────────────────────────────────────
function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavigationItem
  active: boolean
  onNavigate: (navigation: NavigationKey) => void
}) {
  const { id, label, icon: Icon, available } = item
  return (
    <button
      type="button"
      disabled={!available}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'bg-[#EEF2FF] font-semibold text-[#4F6EF7]'
          : available
          ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          : 'cursor-not-allowed text-slate-400'
      }`}
      onClick={() => onNavigate(id)}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? 'text-[#4F6EF7]' : 'text-slate-400 group-hover:text-slate-600'}
      />
      <span className="flex-1 leading-none">{label}</span>
      {!available && (
        <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-slate-400">
          soon
        </span>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────
// Header controls
// ─────────────────────────────────────────────
function CloudButton({
  connected,
  status,
  pending,
  compact = false,
  onClick,
}: {
  connected: boolean
  status: ReturnType<typeof useAppData>['cloudStatus']
  pending: boolean
  compact?: boolean
  onClick: () => void
}) {
  const Icon = connected ? Cloud : CloudOff
  const syncing = status === 'syncing' || status === 'loading'
  const hasProblem = status === 'error' || status === 'offline' || status === 'auth_expired'
  const label = !connected
    ? '云同步'
    : syncing
    ? '同步中'
    : pending
    ? '待上传'
    : hasProblem
    ? '同步异常'
    : '已同步'

  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition ${
        hasProblem
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : connected && pending
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : connected
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
          : 'border-slate-200 bg-white text-slate-600'
      }`}
      onClick={onClick}
    >
      <Icon size={13} className={syncing ? 'animate-pulse' : undefined} />
      {!compact && label}
    </button>
  )
}

function InstallButton({ compact = false, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4F6EF7] px-3 text-[12px] font-semibold text-white shadow-sm shadow-indigo-500/20 transition hover:bg-indigo-600"
      onClick={onClick}
    >
      <Download size={13} />
      {!compact && '安装应用'}
    </button>
  )
}

function PrivacyButton({ compact = false, onClick }: { compact?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
      onClick={onClick}
    >
      <Eye size={13} />
      {!compact && '隐私设置'}
    </button>
  )
}

function HeaderPill({ icon: Icon, label }: { icon: typeof SlidersHorizontal; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300"
    >
      <Icon size={13} className="text-slate-400" />
      {label}
      <ChevronDown size={12} className="text-slate-300" />
    </button>
  )
}

function InstallHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="安装到手机桌面" description="请先用手机浏览器打开部署后的网址。" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">iPhone / iPad</p>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-500">
            <Share size={16} className="mt-1 shrink-0 text-indigo-500" />
            使用 Safari 打开网址，点击底部"分享"，再选择"添加到主屏幕"。
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Android</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            使用 Chrome 打开网址，点击浏览器菜单中的"安装应用"或"添加到主屏幕"。
          </p>
        </div>
        <p className="text-xs leading-5 text-amber-600">
          登录同一个云同步账号后，电脑和手机会共享数据；未登录时仍使用本机存储。
        </p>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// Page meta
// ─────────────────────────────────────────────
function getPageMeta(navigation: NavigationKey) {
  const map: Record<NavigationKey, { title: string; subtitle: string }> = {
    dashboard: { title: '投资驾驶舱', subtitle: '看收益、再判断风险，最后决定下一步该做什么。' },
    accounts: { title: '账户管理', subtitle: '识别最赚钱、最高效、最值得继续投入的账户。' },
    deposits: { title: '出金管理', subtitle: '追踪净入金、出金和真实收益。' },
    exchange: { title: '换汇管理', subtitle: '记录真实成交汇率和年度汇率损益。' },
    holdings: { title: '持仓管理', subtitle: '管理持仓市值、抵押率和打新能力。' },
    ipos: { title: '新股资料', subtitle: '管理 IPO 基础信息、行业和上市节奏。' },
    subscriptions: { title: '申购记录', subtitle: '以申购记录为核心追踪参与、中签和收益。' },
    allotments: { title: '中签管理', subtitle: '批量录入结果，观察命中率结构。' },
    sales: { title: '卖出记录', subtitle: '记录暗盘、首日和持有后卖出的净收益。' },
    statistics: { title: '数据统计', subtitle: '用排行、趋势和策略分析复盘打新表现。' },
    review: { title: '月度复盘', subtitle: '按月份回看参与、中签、收益和最佳新股。' },
    data: { title: '数据管理', subtitle: '导入导出、备份恢复和迁移数据。' },
    safety: { title: '数据安全', subtitle: '操作日志、版本快照和数据健康检查。' },
    settings: { title: '设置中心', subtitle: '配置你的个人投资驾驶舱。' },
  }
  return map[navigation]
}
