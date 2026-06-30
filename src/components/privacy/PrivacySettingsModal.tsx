import { Eye, EyeOff, WalletCards } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { usePrivacy } from '../../hooks/usePrivacy'
import {
  AMOUNT_ONLY_PRIVACY_SETTINGS,
  HIDDEN_PRIVACY_SETTINGS,
  VISIBLE_PRIVACY_SETTINGS,
  type PrivacyField,
} from '../../services/privacy'

const options: {
  field: PrivacyField
  label: string
  description: string
}[] = [
  { field: 'accountName', label: '账户姓名', description: '刘老头 → 刘**' },
  { field: 'accountSuffix', label: '账户后四位', description: '7143 → ****' },
  { field: 'amount', label: '金额', description: '资产、价格、出金等金额' },
  { field: 'profit', label: '收益', description: '盈利与亏损金额' },
  { field: 'profitRate', label: '收益率', description: '25.15% → **%' },
  { field: 'investment', label: '投入金额', description: '入金与申购投入' },
  {
    field: 'accountRanking',
    label: '账户排行榜',
    description: '保留名次和名称，隐藏分析明细',
  },
  {
    field: 'ipoRanking',
    label: '新股排行榜',
    description: '保留股票名称，隐藏分析明细',
  },
  {
    field: 'dashboardKpi',
    label: '首页 KPI',
    description: '隐藏首页顶部核心指标',
  },
]

export function PrivacySettingsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { settings, updateSetting, applySettings } = usePrivacy()

  return (
    <Modal
      open={open}
      title="隐私设置"
      description="按截图场景自由组合，修改后立即生效并自动保存。"
      onClose={onClose}
    >
      <div className="p-5 sm:px-7 sm:py-6">
        <div className="grid gap-2 sm:grid-cols-3">
          <PresetButton
            icon={Eye}
            label="全部显示"
            onClick={() => applySettings({ ...VISIBLE_PRIVACY_SETTINGS })}
          />
          <PresetButton
            icon={EyeOff}
            label="全部隐藏"
            onClick={() => applySettings({ ...HIDDEN_PRIVACY_SETTINGS })}
          />
          <PresetButton
            icon={WalletCards}
            label="仅隐藏金额"
            onClick={() => applySettings({ ...AMOUNT_ONLY_PRIVACY_SETTINGS })}
          />
        </div>

        <div className="mt-6 divide-y divide-[#F4F1ED] rounded-2xl border border-[#E4DFD6]">
          {options.map((option) => (
            <label
              key={option.field}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 hover:bg-[#F4F1ED]"
            >
              <div>
                <p className="text-sm font-semibold text-[#5A5246]">
                  {option.label}
                </p>
                <p className="mt-0.5 text-xs text-[#A8A296]">
                  {option.description}
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings[option.field]}
                className="h-4 w-4 rounded border-[#D2CBBF] text-brand-600 focus:ring-brand-500"
                onChange={(event) =>
                  updateSetting(option.field, event.target.checked)
                }
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#A8A296]">
          勾选表示隐藏。隐私设置只影响显示，不会修改或删除任何原始数据。
        </p>
      </div>
    </Modal>
  )
}

function PresetButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DFD6] bg-white px-3 py-2.5 text-xs font-semibold text-[#736A5C] hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
