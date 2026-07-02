export default function SyncV2Page() {
  return (
    <main className="space-y-6 p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Sync
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">同步后台</h1>
        <p className="mt-2 text-sm text-slate-500">
          后台骨架：所有 Provider 通过 SyncService 运行，并写入 sync_log。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {['最后同步时间', '同步状态', '新增 IPO', '失败数量'].map((label) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-xl font-semibold text-slate-900">读取 /api/sync</p>
          </article>
        ))}
      </section>

      <form action="/api/sync" method="post">
        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          立即同步
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">同步日志</h2>
        <p className="mt-2 text-sm text-slate-500">
          V2 运行时接入后，这里显示 sync_log 最近记录：provider、status、added、
          updated、failed、message。
        </p>
      </section>
    </main>
  )
}
