import {
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
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-slate-950 lg:flex">
      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-3 shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur-xl sm:px-4 lg:hidden">
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
            className="rounded-[14px] p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="打开导航"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[300px] flex-col border-r border-slate-200/70 bg-white/82 text-slate-900 shadow-[10px_0_30px_rgba(15,23,42,.03)] backdrop-blur-xl lg:flex">
        <div className="flex h-[72px] items-center px-6">
          <Brand />
        </div>
        <SidebarContent
          activeNavigation={activeNavigation}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            aria-label="关闭导航"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-[min(82vw,19rem)] flex-col bg-white text-slate-950 shadow-modal">
            <div className="flex h-20 items-center justify-between px-5">
              <Brand />
              <button
                type="button"
                className="rounded-[14px] p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="关闭导航"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={21} />
              </button>
            </div>
            <SidebarContent
              activeNavigation={activeNavigation}
              onNavigate={handleNavigate}
            />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="min-w-0 flex-1 lg:ml-[300px]">
        {/* Desktop header */}
        <div className="sticky top-0 z-20 hidden h-[72px] items-center justify-between gap-4 border-b border-slate-200/70 bg-[#F8FAFC]/85 px-8 shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur-xl lg:flex">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold tracking-[-0.035em] text-[#0F172A]">
              {pageMeta.title}
            </h1>
            <p className="mt-0.5 truncate text-[13px] leading-5 text-slate-400">
              {pageMeta.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <HeaderPill icon={SlidersHorizontal} label="全部账户" />
            <HeaderPill icon={CalendarRange} label="近12个月" />
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-[14px] border border-slate-200/80 bg-white text-slate-500 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow-card"
              aria-label="刷新同步"
              onClick={handleRefresh}
            >
              <RefreshCw
                size={17}
                className={
                  cloud.cloudStatus === 'syncing' ? 'animate-spin' : undefined
                }
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
            {/* User avatar */}
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#2563EB] text-sm font-semibold text-white shadow-sm shadow-blue-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-card"
              aria-label="用户菜单"
            >
              W
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="page-enter mx-auto min-w-0 max-w-[1540px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      <PrivacySettingsModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <CloudSyncModal
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
      />
      <InstallHelpModal
        open={installHelpOpen}
        onClose={() => setInstallHelpOpen(false)}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// Sub-components
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
  const hasProblem =
    status === 'error' || status === 'offline' || status === 'auth_expired'
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
      className={`inline-flex h-11 items-center gap-2 rounded-[14px] border px-3.5 text-xs font-medium shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-card ${
        hasProblem
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : connected && pending
            ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            : connected
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
      aria-label="打开云同步"
      onClick={onClick}
    >
      <Icon size={17} className={syncing ? 'animate-pulse' : undefined} />
      {!compact && label}
    </button>
  )
}

function InstallButton({
  compact = false,
  onClick,
}: {
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[#2563EB] px-3.5 text-xs font-medium text-white shadow-sm shadow-blue-500/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-card"
      aria-label="安装港新账本"
      onClick={onClick}
    >
      <Download size={17} />
      {!compact && '安装应用'}
    </button>
  )
}

function InstallHelpModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title="安装到手机桌面"
      description="请先用手机浏览器打开部署后的网址。"
      onClose={onClose}
    >
      <div className="space-y-5 px-5 py-6 sm:px-7">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">iPhone / iPad</p>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-500">
            <Share size={17} className="mt-1 shrink-0 text-brand-600" />
            使用 Safari 打开网址，点击底部"分享"，再选择"添加到主屏幕"。
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
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

function PrivacyButton({
  compact = false,
  onClick,
}: {
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-slate-200/80 bg-white px-3.5 text-xs font-medium text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-card"
      aria-label="打开隐私设置"
      onClick={onClick}
    >
      <Eye size={17} />
      {!compact && '隐私设置'}
    </button>
  )
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-white shadow-lg shadow-blue-500/20">
        <span className="text-base font-black tracking-tighter">HK</span>
      </div>
      <div>
        <p className={`text-[16px] font-bold tracking-[-0.02em] ${inverse ? 'text-white' : 'text-slate-900'}`}>
          港新账本
        </p>
        <p className={`mt-0.5 text-[11px] font-medium tracking-[0.13em] ${inverse ? 'text-slate-500' : 'text-slate-400'}`}>
          PERSONAL INVESTMENT OS
        </p>
      </div>
    </div>
  )
}

function SidebarContent({
  activeNavigation,
  onNavigate,
}: {
  activeNavigation: NavigationKey
  onNavigate: (navigation: NavigationKey) => void
}) {
  const cloud = useAppData()
  const allNavigation = [...mainNavigation, ...secondaryNavigation]
  const navigationGroups: Array<{ label: string; ids: NavigationKey[] }> = [
    {
      label: '驾驶舱',
      ids: ['dashboard', 'statistics', 'review'],
    },
    {
      label: '新股管理',
      ids: ['ipos', 'subscriptions', 'allotments', 'sales'],
    },
    {
      label: '资金中心',
      ids: ['accounts', 'deposits', 'exchange', 'holdings'],
    },
    {
      label: '系统',
      ids: ['data', 'safety', 'settings'],
    },
  ]
  return (
    <>
      <nav className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
        {navigationGroups.map((group) => {
          const items = group.ids
            .map((id) => allNavigation.find((item) => item.id === id))
            .filter((item): item is NavigationItem => Boolean(item))
          if (items.length === 0) return null
          return (
            <div key={group.label}>
              <p className="px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400/80">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={item.id === activeNavigation}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Sidebar footer card */}
      <div className="m-5 rounded-[20px] border border-slate-900/[0.05] bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
          <ShieldCheck size={15} className="text-emerald-500" />
          {cloud.cloudUser ? '本地 + 云端保护' : '本地数据保护'}
        </div>
        <p className="text-[12px] leading-[1.6] text-slate-400">
          {cloud.cloudUser
            ? `已登录 ${cloud.cloudUser.email}，修改后自动同步。`
            : '数据保存在当前浏览器；登录云同步后可跨设备使用。'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] font-medium tracking-wide text-slate-300">
            v{APP_VERSION}
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
            {cloud.cloudUser ? '云端' : '本地'}
          </span>
        </div>
      </div>
    </>
  )
}

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
      className={`group flex min-h-[42px] w-full items-center gap-3 rounded-[14px] px-3 text-left text-[15px] font-medium transition duration-150 ${
        active
          ? 'bg-[#2563EB] font-semibold text-white shadow-sm shadow-blue-500/20'
          : available
            ? 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950'
            : 'cursor-not-allowed text-slate-400'
      }`}
      onClick={() => onNavigate(id)}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.2 : 1.8}
        className={active ? 'text-white/90' : ''}
      />
      <span className="flex-1 leading-none">{label}</span>
      {!available && (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
          soon
        </span>
      )}
    </button>
  )
}

function HeaderPill({
  icon: Icon,
  label,
}: {
  icon: typeof SlidersHorizontal
  label: string
}) {
  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-slate-200/80 bg-white px-3.5 text-xs font-medium text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-card"
    >
      <Icon size={15} className="text-slate-400" />
      {label}
      <ChevronDown size={13} className="text-slate-300" />
    </button>
  )
}

function getPageMeta(navigation: NavigationKey) {
  const map: Record<NavigationKey, { title: string; subtitle: string }> = {
    dashboard: {
      title: '投资驾驶舱',
      subtitle: '看收益、识风险、定下一步行动',
    },
    accounts: {
      title: '账户管理',
      subtitle: '识别最赚钱、最高效、最值得继续投入的账户',
    },
    deposits: {
      title: '出金管理',
      subtitle: '追踪净入金、出金和真实收益',
    },
    exchange: {
      title: '换汇管理',
      subtitle: '记录真实成交汇率和年度汇率损益',
    },
    holdings: {
      title: '持仓管理',
      subtitle: '管理持仓市值、抵押率和打新能力',
    },
    ipos: {
      title: '新股资料',
      subtitle: '管理 IPO 基础信息、行业和上市节奏',
    },
    subscriptions: {
      title: '申购记录',
      subtitle: '以申购记录为核心追踪参与、中签和收益',
    },
    allotments: {
      title: '中签管理',
      subtitle: '批量录入结果，观察命中率结构',
    },
    sales: {
      title: '卖出记录',
      subtitle: '记录暗盘、首日和持有后卖出的净收益',
    },
    statistics: {
      title: '数据统计',
      subtitle: '用排行、趋势和策略分析复盘打新表现',
    },
    review: {
      title: '月度复盘',
      subtitle: '按月份回看参与、中签、收益和最佳新股',
    },
    data: {
      title: '数据管理',
      subtitle: '导入导出、备份恢复和迁移数据',
    },
    safety: {
      title: '数据安全',
      subtitle: '操作日志、版本快照和数据健康检查',
    },
    settings: {
      title: '设置',
      subtitle: '配置你的个人投资驾驶舱',
    },
  }
  return map[navigation]
}
