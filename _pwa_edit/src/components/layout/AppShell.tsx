import { Download, Eye, Menu, Share, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import {
  mainNavigation,
  secondaryNavigation,
  type NavigationItem,
  type NavigationKey,
} from '../../app/navigation'
import { PrivacySettingsModal } from '../privacy/PrivacySettingsModal'
import { Modal } from '../ui/Modal'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches,
  )

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

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-1">
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

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-ink-950 text-white lg:flex">
        <div className="flex h-20 items-center px-6">
          <Brand inverse />
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
          <aside className="relative flex h-full w-[min(82vw,19rem)] flex-col bg-ink-950 text-white shadow-modal">
            <div className="flex h-20 items-center justify-between px-5">
              <Brand inverse />
              <button
                type="button"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
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

      <main className="min-w-0 flex-1 lg:ml-64">
        <div className="sticky top-0 z-20 hidden h-16 items-center justify-end gap-2 border-b border-slate-200/80 bg-white/90 px-10 backdrop-blur lg:flex">
          {!installed && <InstallButton onClick={handleInstall} />}
          <PrivacyButton onClick={() => setPrivacyOpen(true)} />
        </div>
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
      <PrivacySettingsModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <InstallHelpModal
        open={installHelpOpen}
        onClose={() => setInstallHelpOpen(false)}
      />
    </div>
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
      className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
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
          当前数据保存在设备浏览器内。电脑数据需要先导出 JSON，再在手机端导入。
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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
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
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
        <span className="text-sm font-black tracking-tighter">HK</span>
      </div>
      <div>
        <p className={`text-sm font-bold tracking-wide ${inverse ? 'text-white' : 'text-slate-900'}`}>
          港新账本
        </p>
        <p className={`text-[10px] tracking-[0.18em] ${inverse ? 'text-slate-500' : 'text-slate-400'}`}>
          IPO DASHBOARD
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
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
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
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
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

      <div className="m-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
          <ShieldCheck size={15} className="text-emerald-400" />
          本地数据保护
        </div>
        <p className="text-[11px] leading-5 text-slate-500">
          所有账户数据仅保存在当前浏览器中。
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
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
        active
          ? 'bg-brand-500/15 font-medium text-brand-300'
          : available
            ? 'text-slate-400 hover:bg-slate-900 hover:text-white'
            : 'cursor-not-allowed text-slate-600'
      }`}
      onClick={() => onNavigate(id)}
    >
      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
      <span className="flex-1">{label}</span>
      {!available && (
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-600">
          即将上线
        </span>
      )}
    </button>
  )
}
