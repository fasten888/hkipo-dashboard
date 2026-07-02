export default function AccountsV2Page() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Accounts
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">账户资产</h1>
        <p className="mt-2 text-sm text-slate-500">
          账户现金、冻结资金、融资额度和参与中的新股将统一从 ACCOUNT 表聚合。
        </p>
      </header>
    </main>
  )
}
