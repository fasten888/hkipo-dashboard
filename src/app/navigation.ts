import {
  BarChart3,
  ArrowRightLeft,
  CheckCircle2,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  CalendarRange,
  Rocket,
  Settings,
  ShieldCheck,
  Tags,
  WalletCards,
  ChartCandlestick,
  Database,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  id: NavigationKey
  label: string
  icon: LucideIcon
  available: boolean
}

export type NavigationKey =
  | 'dashboard'
  | 'accounts'
  | 'deposits'
  | 'exchange'
  | 'holdings'
  | 'ipos'
  | 'subscriptions'
  | 'allotments'
  | 'sales'
  | 'statistics'
  | 'review'
  | 'dataCenter'
  | 'data'
  | 'safety'
  | 'settings'

export const mainNavigation: NavigationItem[] = [
  { id: 'dashboard', label: '总览', icon: LayoutDashboard, available: true },
  { id: 'accounts', label: '账户管理', icon: WalletCards, available: true },
  { id: 'deposits', label: '出金管理', icon: Landmark, available: true },
  { id: 'exchange', label: '换汇管理', icon: ArrowRightLeft, available: true },
  { id: 'holdings', label: '持仓管理', icon: ChartCandlestick, available: true },
  { id: 'ipos', label: '新股资料', icon: Rocket, available: true },
  {
    id: 'subscriptions',
    label: '申购记录',
    icon: ClipboardList,
    available: true,
  },
  {
    id: 'allotments',
    label: '中签管理',
    icon: CheckCircle2,
    available: true,
  },
  { id: 'sales', label: '卖出记录', icon: Tags, available: true },
  { id: 'statistics', label: '数据统计', icon: BarChart3, available: true },
  { id: 'review', label: '月度复盘', icon: CalendarRange, available: true },
]

export const secondaryNavigation: NavigationItem[] = [
  { id: 'dataCenter', label: '数据中心', icon: Database, available: true },
  { id: 'data', label: '数据管理', icon: ReceiptText, available: true },
  { id: 'safety', label: '数据安全', icon: ShieldCheck, available: true },
  { id: 'settings', label: '设置', icon: Settings, available: false },
]
