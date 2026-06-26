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
  UserCircle2,
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
    <div className="min-h-screen overflow-x-hidden bg-[#F7F9FC] text-slate-950 lg:flex">
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
            className="rounded-xl p-2 text-slate-600 hover:bg-slate-100"
            aria-label="打开导航"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17.5rem] flex-col border-r border-slate-200/70 bg-white/80 text-slate-900 shadow-[10px_0_30px_rgba(15,23,42,.03)] backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center px-6">
          <Brand />
        </div>
        <SidebarContent
          activeNavigation={activeNavigation}
          onNavigate={handleNavigate}
        />
      </aside>

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
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
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

      <main className="min-w-0 flex-1 lg:ml-[17.5rem]">
        <div className="sticky top-0 z-20 hidden h-20 items-center justify-between gap-4 border-b border-slate-200/70 bg-[#F7F9FC]/85 px-10 shadow-[0_1px_0_rgba(15,23,42,.03)] backdrop-blur-xl lg:flex">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              港新账本 · Personal Investment OS
            </p>
            <h1 className="mt-1 truncate text-xl font-medium tracking-[-0.02em] text-slate-950">
              {pageMeta.title}
            </h1>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {pageMeta.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <HeaderPill icon={SlidersHorizontal} label="全部账户" />
            <HeaderPill icon={CalendarRange} label="近12个月" />
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow-card"
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
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900 hover:shadow-card"
              aria-label="用户菜单"
            >
              <UserCircle2 size={18} />
            </button>
          </div>
        </div>
        <div className="page-enter mx-auto min-w-0 max-w-[1540px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
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
      className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-card ${
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
      className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-3.5 py-2.5 text-xs font-medium text-white shadow-sm shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-card"
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
            使用 Safari 打开网址，点击底部“分享”，再选择“添加到主屏幕”。
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-slate-800">Android</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            使用 Chrome 打开网址，点击浏览器菜单中的“安装应用”或“添加到主屏幕”。
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
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-card"
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
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-white shadow-lg shadow-blue-500/20">
        <span className="text-sm font-black tracking-tighter">HK</span>
      </div>
      <div>
        <p className={`text-sm font-medium tracking-wide ${inverse ? 'text-white' : 'text-slate-900'}`}>
          港新账本
        </p>
        <p className={`text-[10px] tracking-[0.2em] ${inverse ? 'text-slate-500' : 'text-slate-400'}`}>
          INVESTMENT OS
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
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          工作台
        </p>
        {mainNavigation.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={item.id === activeNavigation}
            onNavigate={onNavigate}
          />
        ))}

        <div className="pt-7">
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            系统
          </p>
          {secondaryNavigation.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={item.id === activeNavigation}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="m-4 rounded-[22px] border border-slate-200/70 bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-700">
          <ShieldCheck size={15} className="text-emerald-500" />
          {cloud.cloudUser ? '本地 + 云端保护' : '本地数据保护'}
        </div>
        <p className="text-[11px] leading-5 text-slate-500">
          {cloud.cloudUser
            ? `已登录 ${cloud.cloudUser.email}，修改后自动同步。`
            : '数据保存在当前浏览器；登录云同步后可跨设备使用。'}
        </p>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
          v{APP_VERSION}
        </p>
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
      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
        active
          ? 'bg-slate-950 font-medium text-white shadow-card'
          : available
            ? 'text-slate-500 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950'
            : 'cursor-not-allowed text-slate-600'
      }`}
      onClick={() => onNavigate(id)}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1">{label}</span>
      {!available && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-400">
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
      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3.5 text-xs font-medium text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950 hover:shadow-card"
    >
      <Icon size={16} className="text-slate-400" />
      {label}
      <ChevronDown size={14} className="text-slate-300" />
    </button>
  )
}

function getPageMeta(navigation: NavigationKey) {
  const map: Record<NavigationKey, { title: string; subtitle: string }> = {
    dashboard: {
      title: '总览',
      subtitle: '看收益、风险和下一步行动。',
    },
    accounts: {
      title: '账户管理',
      subtitle: '识别最赚钱、最高效、最值得继续投入的账户。',
    },
    deposits: {
      title: '出金管理',
      subtitle: '追踪净入金、出金和真实收益。',
    },
    exchange: {
      title: '换汇管理',
      subtitle: '记录真实成交汇率和年度汇率损益。',
    },
    holdings: {
      title: '持仓管理',
      subtitle: '管理持仓市值、抵押率和打新能力。',
    },
    ipos: {
      title: '新股资料',
      subtitle: '管理 IPO 基础信息、行业和上市节奏。',
    },
    subscriptions: {
      title: '申购记录',
      subtitle: '以申购记录为核心追踪参与、中签和收益。',
    },
    allotments: {
      title: '中签管理',
      subtitle: '批量录入结果，观察命中率结构。',
    },
    sales: {
      title: '卖出记录',
      subtitle: '记录暗盘、首日和持有后卖出的净收益。',
    },
    statistics: {
      title: '数据统计',
      subtitle: '用排行、趋势和策略分析复盘打新表现。',
    },
    review: {
      title: '月度复盘',
      subtitle: '按月份回看参与、中签、收益和最佳新股。',
    },
    data: {
      title: '数据管理',
      subtitle: '导入导出、备份恢复和迁移数据。',
    },
    safety: {
      title: '数据安全',
      subtitle: '操作日志、版本快照和数据健康检查。',
    },
    settings: {
      title: '设置',
      subtitle: '配置你的个人投资驾驶舱。',
    },
  }
  return map[navigation]
}
