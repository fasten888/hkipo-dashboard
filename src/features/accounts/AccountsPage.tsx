import {
  Ban,
  Building2,
  CircleDollarSign,
  Download,
  Edit3,
  Layers3,
  Loader2,
  Plus,
  Power,
  Save,
  Search,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'

type BrokerProfile = {
  id: string
  name: string
  defaultMarginMultiple: number
  defaultFee: number
  defaultFinancingRate: number
}

type DbAccount = {
  id: string
  name: string
  broker: string | null
  brokerProfileId: string | null
  currency: string
  cash: number
  frozen: number
  marginLimit: number
  availableMargin: number
  financingMultiple: number
  status: 'active' | 'disabled' | string
  note: string | null
  createdAt: string
  updatedAt: string
  brokerProfile: BrokerProfile | null
  accountIpos: Array<{
    id: string
    status: string
    profit: number
    ipo: {
      code: string
      name: string
      subscribeEnd: string | null
    }
  }>
  _count?: {
    accountIpos: number
  }
}

type AccountSummary = {
  accounts: number
  activeAccounts: number
  disabledAccounts: number
  cash: number
  frozen: number
  marginLimit: number
  availableMargin: number
}

type AccountPayload = {
  ok: boolean
  message?: string
  data?: {
    accounts: DbAccount[]
    brokerProfiles: BrokerProfile[]
    summary: AccountSummary
  }
  result?: {
    received: number
    imported: number
    created: number
    updated: number
  }
}

type AccountFormState = {
  id?: string
  name: string
  broker: string
  brokerProfileId: string
  currency: string
  cash: string
  frozen: string
  marginLimit: string
  availableMargin: string
  financingMultiple: string
  status: 'active' | 'disabled'
  note: string
}

type BrokerFormState = {
  id?: string
  name: string
  defaultMarginMultiple: string
  defaultFee: string
  defaultFinancingRate: string
}

interface AccountsPageProps {
  onViewAccount: (accountId: string) => void
}

const emptyAccountForm: AccountFormState = {
  name: '',
  broker: '',
  brokerProfileId: '',
  currency: 'HKD',
  cash: '0',
  frozen: '0',
  marginLimit: '0',
  availableMargin: '0',
  financingMultiple: '10',
  status: 'active',
  note: '',
}

const emptyBrokerForm: BrokerFormState = {
  name: '',
  defaultMarginMultiple: '10',
  defaultFee: '100',
  defaultFinancingRate: '0',
}

export function AccountsPage({ onViewAccount }: AccountsPageProps) {
  const [accounts, setAccounts] = useState<DbAccount[]>([])
  const [brokerProfiles, setBrokerProfiles] = useState<BrokerProfile[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [accountForm, setAccountForm] = useState<AccountFormState>(emptyAccountForm)
  const [brokerForm, setBrokerForm] = useState<BrokerFormState>(emptyBrokerForm)
  const [search, setSearch] = useState('')
  const [importText, setImportText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadAccounts()
  }, [])

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return accounts.filter((account) => {
      if (!query) return true
      return [
        account.name,
        account.broker,
        account.currency,
        account.status,
        account.note,
      ].some((value) => value?.toLowerCase().includes(query))
    })
  }, [accounts, search])

  const activeAccounts = summary?.activeAccounts ?? accounts.filter((account) => account.status === 'active').length
  const totalCapacity = (summary?.cash ?? 0) + (summary?.availableMargin ?? 0) - (summary?.frozen ?? 0)

  async function loadAccounts() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/accounts', { headers: { accept: 'application/json' } })
      const body = (await response.json()) as AccountPayload
      if (!response.ok || !body.ok || !body.data) throw new Error(body.message || '账户数据读取失败')
      setAccounts(body.data.accounts)
      setBrokerProfiles(body.data.brokerProfiles)
      setSummary(body.data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : '账户数据读取失败')
    } finally {
      setLoading(false)
    }
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        account: {
          name: accountForm.name,
          broker: accountForm.broker,
          brokerProfileId: accountForm.brokerProfileId || null,
          currency: accountForm.currency,
          cash: toNumber(accountForm.cash),
          frozen: toNumber(accountForm.frozen),
          marginLimit: toNumber(accountForm.marginLimit),
          availableMargin: toNumber(accountForm.availableMargin),
          financingMultiple: toNumber(accountForm.financingMultiple),
          status: accountForm.status,
          note: accountForm.note,
        },
      }
      const response = await fetch('/api/accounts', {
        method: accountForm.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(accountForm.id ? { id: accountForm.id, ...payload } : payload),
      })
      const body = (await response.json()) as AccountPayload
      if (!response.ok || !body.ok) throw new Error(body.message || '账户保存失败')
      setNotice(accountForm.id ? '账户已更新' : '账户已新增')
      setAccountForm(emptyAccountForm)
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '账户保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveBrokerProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/broker-profiles', {
        method: brokerForm.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          id: brokerForm.id,
          name: brokerForm.name,
          defaultMarginMultiple: toNumber(brokerForm.defaultMarginMultiple),
          defaultFee: toNumber(brokerForm.defaultFee),
          defaultFinancingRate: toNumber(brokerForm.defaultFinancingRate),
        }),
      })
      const body = (await response.json()) as { ok: boolean; message?: string }
      if (!response.ok || !body.ok) throw new Error(body.message || '券商配置保存失败')
      setNotice(brokerForm.id ? '券商配置已更新' : '券商配置已新增')
      setBrokerForm(emptyBrokerForm)
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '券商配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function removeAccount(account: DbAccount) {
    if (!window.confirm(`确定删除账户「${account.name}」吗？相关 ACCOUNT_IPO 记录会一并删除。`)) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/accounts?id=${encodeURIComponent(account.id)}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      })
      const body = (await response.json()) as AccountPayload
      if (!response.ok || !body.ok) throw new Error(body.message || '删除账户失败')
      setNotice('账户已删除')
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除账户失败')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(account: DbAccount) {
    const nextStatus = account.status === 'disabled' ? 'active' : 'disabled'
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ id: account.id, action: 'status', status: nextStatus }),
      })
      const body = (await response.json()) as AccountPayload
      if (!response.ok || !body.ok) throw new Error(body.message || '账户状态更新失败')
      setNotice(nextStatus === 'active' ? '账户已启用' : '账户已禁用')
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '账户状态更新失败')
    } finally {
      setSaving(false)
    }
  }

  async function importAccounts() {
    const rows = parseAccountRows(importText)
    if (rows.length === 0) {
      setError('没有识别到账户数据，请粘贴 CSV 或从 Excel 复制表格。')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'import', rows }),
      })
      const body = (await response.json()) as AccountPayload
      if (!response.ok || !body.ok || !body.result) throw new Error(body.message || '导入失败')
      setNotice(`导入完成：新增 ${body.result.created}，更新 ${body.result.updated}`)
      setImportText('')
      await loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setSaving(false)
    }
  }

  function editAccount(account: DbAccount) {
    setAccountForm({
      id: account.id,
      name: account.name,
      broker: account.broker ?? '',
      brokerProfileId: account.brokerProfileId ?? '',
      currency: account.currency,
      cash: String(account.cash),
      frozen: String(account.frozen),
      marginLimit: String(account.marginLimit),
      availableMargin: String(account.availableMargin),
      financingMultiple: String(account.financingMultiple),
      status: account.status === 'disabled' ? 'disabled' : 'active',
      note: account.note ?? '',
    })
  }

  function editBroker(profile: BrokerProfile) {
    setBrokerForm({
      id: profile.id,
      name: profile.name,
      defaultMarginMultiple: String(profile.defaultMarginMultiple),
      defaultFee: String(profile.defaultFee),
      defaultFinancingRate: String(profile.defaultFinancingRate),
    })
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Excel 文件直读将在下一版接入。当前请从 Excel 复制表格粘贴，或另存为 CSV 后导入。')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-500/80">Account Management Center</p>
            <h1 className="mt-3 text-[34px] font-bold tracking-[-0.05em] text-slate-950 md:text-[44px]">账户管理中心</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500 md:text-base">
              所有账户、券商配置和余额导入统一进入数据库，Planner 将直接读取这里的真实 Account。
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAccountForm(emptyAccountForm)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-500"
          >
            <Plus size={17} />
            新增账户
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{notice}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="账户总数" value={summary?.accounts ?? accounts.length} hint={`${activeAccounts} 个启用`} icon={<WalletCards size={18} />} tone="blue" />
        <MetricCard label="现金余额" value={formatMoney(summary?.cash ?? 0)} hint="所有账户现金合计" icon={<CircleDollarSign size={18} />} tone="emerald" />
        <MetricCard label="冻结资金" value={formatMoney(summary?.frozen ?? 0)} hint="正在占用资金" icon={<Layers3 size={18} />} tone="amber" />
        <MetricCard label="总打新能力" value={formatMoney(totalCapacity)} hint="现金 + 可用融资 - 冻结" icon={<Building2 size={18} />} tone="purple" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Panel title={accountForm.id ? '编辑账户' : '新增账户'} subtitle="账户字段来自 ACCOUNT，保存后 Planner 可立即读取。">
            <form onSubmit={saveAccount} className="grid gap-4 md:grid-cols-2">
              <Field label="账户名称">
                <input className="form-input" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} required />
              </Field>
              <Field label="券商">
                <input className="form-input" value={accountForm.broker} onChange={(event) => setAccountForm({ ...accountForm, broker: event.target.value })} placeholder="致富证券 / 富途 / 辉立" />
              </Field>
              <Field label="券商配置">
                <select className="form-input" value={accountForm.brokerProfileId} onChange={(event) => {
                  const profile = brokerProfiles.find((item) => item.id === event.target.value)
                  setAccountForm({
                    ...accountForm,
                    brokerProfileId: event.target.value,
                    broker: profile?.name ?? accountForm.broker,
                    financingMultiple: profile ? String(profile.defaultMarginMultiple) : accountForm.financingMultiple,
                  })
                }}>
                  <option value="">不关联</option>
                  {brokerProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="币种">
                <select className="form-input" value={accountForm.currency} onChange={(event) => setAccountForm({ ...accountForm, currency: event.target.value })}>
                  <option value="HKD">HKD</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                </select>
              </Field>
              <Field label="现金">
                <input className="form-input" inputMode="decimal" value={accountForm.cash} onChange={(event) => setAccountForm({ ...accountForm, cash: event.target.value })} />
              </Field>
              <Field label="冻结资金">
                <input className="form-input" inputMode="decimal" value={accountForm.frozen} onChange={(event) => setAccountForm({ ...accountForm, frozen: event.target.value })} />
              </Field>
              <Field label="融资额度">
                <input className="form-input" inputMode="decimal" value={accountForm.marginLimit} onChange={(event) => setAccountForm({ ...accountForm, marginLimit: event.target.value })} />
              </Field>
              <Field label="可用融资">
                <input className="form-input" inputMode="decimal" value={accountForm.availableMargin} onChange={(event) => setAccountForm({ ...accountForm, availableMargin: event.target.value })} />
              </Field>
              <Field label="融资倍数">
                <input className="form-input" inputMode="decimal" value={accountForm.financingMultiple} onChange={(event) => setAccountForm({ ...accountForm, financingMultiple: event.target.value })} />
              </Field>
              <Field label="状态">
                <select className="form-input" value={accountForm.status} onChange={(event) => setAccountForm({ ...accountForm, status: event.target.value as AccountFormState['status'] })}>
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </Field>
              <Field label="备注" className="md:col-span-2">
                <textarea className="form-input min-h-[96px]" value={accountForm.note} onChange={(event) => setAccountForm({ ...accountForm, note: event.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button type="submit" disabled={saving} className="primary-action">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  保存账户
                </button>
                {accountForm.id && (
                  <button type="button" className="secondary-action" onClick={() => setAccountForm(emptyAccountForm)}>
                    取消编辑
                  </button>
                )}
              </div>
            </form>
          </Panel>

          <Panel title="账户列表" subtitle="启用/禁用不会删除账户，只会从可用账户中排除。">
            <div className="mb-4 flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索账户、券商、币种或备注" className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400" />
            </div>

            {loading ? (
              <InlineState icon={<Loader2 className="animate-spin" size={18} />} text="正在读取数据库账户" />
            ) : filteredAccounts.length === 0 ? (
              <InlineState icon={<WalletCards size={18} />} text="暂无账户，先在上方新增或导入余额。" />
            ) : (
              <div className="space-y-3">
                {filteredAccounts.map((account) => (
                  <article key={account.id} className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <button type="button" onClick={() => onViewAccount(account.id)} className="min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-bold tracking-[-0.03em] text-slate-950">{account.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${account.status === 'disabled' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                            {account.status === 'disabled' ? '禁用' : '启用'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {account.broker || '未设置券商'} · {account.currency} · {account.financingMultiple}x
                        </p>
                      </button>
                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:min-w-[560px]">
                        <MiniStat label="现金" value={formatMoney(account.cash)} />
                        <MiniStat label="冻结" value={formatMoney(account.frozen)} />
                        <MiniStat label="融资" value={formatMoney(account.availableMargin || account.marginLimit)} />
                        <MiniStat label="参与" value={`${account._count?.accountIpos ?? account.accountIpos.length} 项`} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="ghost-action" type="button" onClick={() => editAccount(account)}><Edit3 size={15} />编辑</button>
                      <button className="ghost-action" type="button" onClick={() => toggleStatus(account)}>
                        {account.status === 'disabled' ? <Power size={15} /> : <Ban size={15} />}
                        {account.status === 'disabled' ? '启用' : '禁用'}
                      </button>
                      <button className="danger-action" type="button" onClick={() => removeAccount(account)}><Trash2 size={15} />删除</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Broker Profile" subtitle="统一维护券商默认融资倍数、手续费和融资利率。">
            <form onSubmit={saveBrokerProfile} className="space-y-3">
              <Field label="券商名称">
                <input className="form-input" value={brokerForm.name} onChange={(event) => setBrokerForm({ ...brokerForm, name: event.target.value })} required />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="默认倍数">
                  <input className="form-input" inputMode="decimal" value={brokerForm.defaultMarginMultiple} onChange={(event) => setBrokerForm({ ...brokerForm, defaultMarginMultiple: event.target.value })} />
                </Field>
                <Field label="默认手续费">
                  <input className="form-input" inputMode="decimal" value={brokerForm.defaultFee} onChange={(event) => setBrokerForm({ ...brokerForm, defaultFee: event.target.value })} />
                </Field>
                <Field label="融资利率">
                  <input className="form-input" inputMode="decimal" value={brokerForm.defaultFinancingRate} onChange={(event) => setBrokerForm({ ...brokerForm, defaultFinancingRate: event.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="primary-action flex-1">
                  <Save size={16} />
                  保存配置
                </button>
                {brokerForm.id && <button type="button" className="secondary-action" onClick={() => setBrokerForm(emptyBrokerForm)}>取消</button>}
              </div>
            </form>
            <div className="mt-5 space-y-2">
              {brokerProfiles.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">暂无券商配置</p>
              ) : (
                brokerProfiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => editBroker(profile)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-slate-800">{profile.name}</span>
                      <span className="text-xs font-bold text-slate-400">{profile.defaultMarginMultiple}x</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      手续费 {formatMoney(profile.defaultFee)} · 利率 {profile.defaultFinancingRate}%
                    </p>
                  </button>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Import Wizard" subtitle="CSV / 从 Excel 复制粘贴 / 粘贴表格，导入账户余额。">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50">
                <Upload size={16} />
                选择 CSV 文件
                <input type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
              </label>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="粘贴表格：账户名称,券商,币种,现金,冻结资金,融资倍数,状态,备注"
                className="form-input min-h-[180px] font-mono text-xs"
              />
              <div className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-500">
                支持列名：账户名称/name、券商/broker、币种/currency、现金/cash、冻结资金/frozen、融资倍数/financingMultiple、状态/status、备注/note。
              </div>
              <button type="button" onClick={importAccounts} disabled={saving} className="primary-action w-full">
                <Download size={16} />
                导入账户余额
              </button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[30px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-950">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function MetricCard({ label, value, hint, icon, tone }: { label: string; value: ReactNode; hint: string; icon: ReactNode; tone: 'blue' | 'emerald' | 'amber' | 'purple' }) {
  return (
    <div className="rounded-[26px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${toneClass(tone)}`}>{icon}</span>
      </div>
      <p className="mt-5 whitespace-nowrap text-[clamp(1.7rem,2.2vw,2.25rem)] font-bold tracking-[-0.05em] text-slate-950 tabular-nums">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-400">{hint}</p>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-bold text-slate-800 tabular-nums">{value}</p>
    </div>
  )
}

function InlineState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
      <div className="flex items-center gap-2">
        {icon}
        {text}
      </div>
    </div>
  )
}

function toneClass(tone: 'blue' | 'emerald' | 'amber' | 'purple') {
  const classes = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-violet-50 text-violet-600',
  }
  return classes[tone]
}

function toNumber(value: string | number | undefined | null) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function formatMoney(value: number) {
  return `HK$ ${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`
}

function parseAccountRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const cells = lines.map((line) => splitLine(line, delimiter))
  const header = cells[0].map(normalizeHeader)
  const hasHeader = header.some((item) => ['name', 'broker', 'cash', 'frozen'].includes(item))
  const rows = hasHeader ? cells.slice(1) : cells
  const keys = hasHeader ? header : ['name', 'broker', 'currency', 'cash', 'frozen', 'financingMultiple', 'status', 'note']

  return rows.map((row) => {
    const item: Record<string, string | number> = {}
    row.forEach((value, index) => {
      const key = keys[index]
      if (!key) return
      item[key] = ['cash', 'frozen', 'financingMultiple'].includes(key) ? toNumber(value) : value.trim()
    })
    return item
  })
}

function splitLine(line: string, delimiter: string) {
  if (delimiter === '\t') return line.split('\t')

  const values: string[] = []
  let current = ''
  let quoted = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

function normalizeHeader(value: string) {
  const key = value.trim().toLowerCase()
  const map: Record<string, string> = {
    账户名称: 'name',
    账户: 'name',
    name: 'name',
    券商: 'broker',
    broker: 'broker',
    币种: 'currency',
    currency: 'currency',
    现金: 'cash',
    cash: 'cash',
    冻结资金: 'frozen',
    冻结: 'frozen',
    frozen: 'frozen',
    融资倍数: 'financingMultiple',
    financingmultiple: 'financingMultiple',
    status: 'status',
    状态: 'status',
    备注: 'note',
    note: 'note',
  }
  return map[key] ?? key
}
