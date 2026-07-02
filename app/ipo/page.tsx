export default function IpoV2Page() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          IPO
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">新股资料</h1>
        <p className="mt-2 text-sm text-slate-500">
          V2 将从 IPO、IPO_EVENT、IPO_ANALYSIS 表读取官方资料和人工分析。
        </p>
      </header>
    </main>
  )
}
