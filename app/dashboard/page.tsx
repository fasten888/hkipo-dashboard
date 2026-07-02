const dashboardMetrics = [
  '可用资金',
  '冻结资金',
  '融资额度',
  '今日待办事项',
]

export default function DashboardV2Page() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          IPO Command Center
        </h1>
      </header>
      <section className="grid gap-4 md:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <article key={metric} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{metric}</p>
            <p className="mt-4 text-2xl font-semibold text-slate-950">数据库读取</p>
          </article>
        ))}
      </section>
    </main>
  )
}
