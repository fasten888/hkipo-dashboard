# HKIPO Dashboard System Audit Report

审计日期：2026-07-15
结论基于源码、Git 历史、恢复 JSON 和对当前 PostgreSQL 的只读查询。审计未修改业务代码或数据库。

## 1. 执行摘要

1. **真实运行时主数据源是 Supabase PostgreSQL，经 Prisma 和 `/api/app-data` 提供。** localStorage 旧业务代码仍在仓库中，但不在启动读取链上。
2. **6 月 15 日后的申购和卖出记录不是被页面过滤掉，而是没有进入 PostgreSQL。** 当前数据库 163 条 AccountIpo、24 条 SellRecord，业务日期上限均为 2026-06-15；用于迁移的最新恢复 JSON 也正好是 163/24，日期同样截止 6 月 15 日。
3. **页面可能继续读到旧数据的独立风险是 PWA Service Worker。** `/api/*` 没有被排除，当前通用 GET 策略是 cache-first。
4. **英文不是 i18n locale 错误。** 数据模型只有一个 `Ipo.name`；HKEX Provider 按股票代码更新已有 IPO 时，把恢复数据中的中文名覆盖为官方英文名。
5. **账户页面不统一是代码分叉造成的。** AccountsPage 使用专用 API、局部 `MetricCard/Panel` 和自定义 Tailwind；多数旧页面使用 `useAppData` 和共享 `StatCard`。
6. **数据库费用修复后首页不变化是调用链问题。** `/api/app-data` 只将 `commission` 映射为前端 `fee`，没有传递 `financingFee`；首页也不调用已经修改的 `dashboardRepository.ts`。

## 2. 严重问题与证据

### P0：历史迁移在 2026-06-15 截止

当前 PostgreSQL：

| 表 | 数量 | 最新业务日期 |
| --- | ---: | --- |
| Account | 12 | - |
| Ipo | 112 | 其中 93 条在 6 月 15 日后由 Provider 创建 |
| AccountIpo | 163 | subscriptionDate = 2026-06-15 |
| SellRecord | 24 | date = 2026-06-15 |

迁移源：

| 文件 | Account | Ipo | Subscription | Sale | 最后申购/卖出日期 |
| --- | ---: | ---: | ---: | ---: | --- |
| `HKIPO_LATEST_RECOVERY_IMPORT.json` | 12 | 19 | 163 | 24 | 2026-06-15 |
| `recovery/HKIPO_RECOVERY_FULL_20260615_232754.json` | 12 | 19 | 163 | 24 | 2026-06-15 |
| `recovery/HKIPO_RECOVERY_20260615_233745.json` | 12 | 16 | 131 | 23 | 2026-06-11 / 06-08 |

因此，当前 PostgreSQL 与迁移源完全吻合。曾在浏览器中看到的 6 月 15 日后申购/卖出记录没有包含在此次恢复包中。HKEX 同步只增加 IPO 主数据，不会自动生成个人 AccountIpo 或 SellRecord。

**结论：数据库无需回滚；需要找到 6 月 15 日之后的浏览器导出、旧 `public.user_data`、另一台设备 localStorage 或更晚 JSON，做增量 upsert。**

### P0：Service Worker 可能缓存旧 API 快照

`public/sw.js` 对导航和脚本使用 network-first，但其余 GET 先执行 `caches.match()`。`/api/app-data` 没有排除规则，因此处于该 cache-first 路径。API 自身虽返回 `Cache-Control: no-store`，但客户端 Service Worker 的显式 Cache Storage 逻辑仍是不必要且危险的陈旧数据入口。

这不会解释数据库为何只有 163 条记录，但可以解释“数据库更新后某台手机仍显示旧数量”。

### P1：费用修复没有进入首页当前统计链

当前数据库聚合：

```text
AccountIpo.commission = 11,561.84
AccountIpo.financingFee = 0
SellRecord.commission = 0
```

`getAppDataSnapshot()` 的映射是：

```text
AccountIpo.commission -> Subscription.fee
AccountIpo.financingFee -> 不返回前端
```

Dashboard 读取 `useAppData()`，再由客户端 `getSystemStats()` / `getSubscriptionMetrics()` 计算；源码中没有页面请求 `/api/dashboard`。所以修复 `dashboardRepository.ts` 或把数据库 `financingFee` 清零，不会改变这条前端统计链原本已经只使用 `fee` 的结果。

需要先确定唯一费用口径，再让首页、统计页和服务端 API 共用同一个统计实现；不能继续分别修两套公式。

### P1：HKEX Provider 覆盖中文名称

恢复 JSON 中的名称包含 `华健未来-B`、`华曦达`、`深演智能` 等中文名。当前数据库 112 条 IPO 中仅 1 条名称含中文字符，111 条为非中文名称。

根因链：

```text
HKEX Provider record.name (官方英文名)
  -> toIpoWriteData().name
  -> prisma.ipo.update({ where: { code }, data })
  -> 覆盖原 Ipo.name
  -> getAppDataSnapshot() 只返回 ipo.name
  -> 页面显示英文
```

Prisma `Ipo` 只有 `name`，没有 `nameZh/nameEn`；项目也没有 i18n 资源或 locale 状态。`zh-CN` / `zh-HK` 格式化仍存在，因此不是 locale 被写死为 `en`。

### P1：业务数据仍存在残余多路径

- `storage.ts` 仍可读写完整 localStorage 业务快照，但当前启动不调用它。
- DataExport/DataSafety 的 `replaceData()` 只覆盖 React 内存，不写 PostgreSQL；刷新即丢失。
- `holdings`、`fxRates` 只存在 React 内存，而数据库快照固定返回空值。
- Account 管理直接调用 `/api/accounts`，AccountDetail 等页面通过 `/api/app-data` 获取账户。
- `public.user_data` 仍存在，但只被旧诊断脚本使用。

因此项目的核心四页已经数据库化，但“所有业务数据只有一个来源”的迁移尚未彻底完成。

## 3. 启动与自动恢复审计

启动流程初始化空 AppData，然后调用 `/api/app-data`。没有调用 `storage.ts:loadAppData()`，所以：

- localStorage 有业务数据时不会覆盖数据库；
- v1/v2/v3 snapshot 不会自动恢复；
- `restoreAutoBackup()` 当前直接返回 `false`。

手工导入/恢复仍可调用 `replaceData()`，但只在当前 React 会话内生效。这是“看起来恢复成功、刷新后又没了”的潜在原因，而不是数据库被覆盖。

## 4. 页面数据源与默认数量

| 页面 | 数据源 | 审计时默认输入数量 |
| --- | --- | ---: |
| Dashboard | `/api/app-data` -> Prisma | 12 Account / 112 Ipo / 163 AccountIpo / 24 Sale |
| 新股资料 | `useAppData().ipos` -> `/api/app-data` | 112 |
| 账户管理 | `/api/accounts` -> `accountRepository` | 12 |
| 卖出记录 | `useAppData().sales` -> `/api/app-data` | 24 |

以上是源码默认筛选下的输入数量。用户筛选和浏览器 PWA 缓存可让屏幕显示值不同。审计环境未修改浏览器缓存，也未以用户浏览器会话读取 DOM。

## 5. i18n 审计

- 未发现 i18next、语言资源包或全局 locale store。
- UI 文案主要硬编码中文。
- 日期/金额格式主要使用 `zh-CN`、`zh-HK`；少量 `en-US` 仅用于数字格式，不会翻译 IPO 名称。
- 英文内容来自数据库的 `Ipo.name` 和少量硬编码英文模块标题，不是语言切换。

## 6. 设计系统审计

### 使用共享 `StatCard` / `MetricValueText`

- 数据统计 `StatisticsPage`
- 中签管理 `AllotmentsPage`
- 申购记录 `SubscriptionsPage`
- 月度复盘 `MonthlyReviewPage`
- 换汇管理 `ExchangePage`
- 持仓管理 `HoldingsPage`

### 使用局部组件或自定义 div

- `AccountsPage`: 自定义 `MetricCard`、`Panel`、`MiniStat`、`Field`，并直接写 Slate/Blue 样式。
- `DashboardPage`: 自定义 KPI、图表和详情卡。
- `IposPage`、`SalesPage`: 页面内自定义卡片/表格结构。
- `CapitalAllocationPage`: 另有局部 `MetricCard`。
- AccountDetail、IpoDetail、DataCenter、DataExport、DataSafety 也主要使用页面级 div/card。

项目不存在统一的共享 `Card` 或 `Section` 基础组件。账户页是在数据库迁移提交 `fa757d9` 中大幅重写的，同时改为直连 `/api/accounts`，因此既在数据链上也在视觉组件上与旧系统分叉。

## 7. 建议修复顺序（本次未执行）

### 阶段 1：保护并找回数据

1. 立即导出当前 PostgreSQL，只读保留现状。
2. 搜索 6 月 15 日后的浏览器 JSON、Chrome LevelDB、旧 `public.user_data` 和手机备份。
3. 先生成差异报告，再按稳定 ID 或业务复合键增量 upsert；禁止全量覆盖。

### 阶段 2：消除陈旧读取

1. Service Worker 对 `/api/` 使用 network-only，并清除旧版本 API Cache。
2. 在页面显示 API 响应时间或数据版本，便于识别缓存。
3. 保留 `/api/app-data` 的 `no-store`。

### 阶段 3：统一数据与统计

1. 选择一个统计层：推荐服务端统一聚合，页面只消费结果；或删除未使用的 `/api/dashboard` 统计实现。
2. 导入/恢复必须通过数据库事务 API，禁止只 `setData()`。
3. Holdings/FxRates 完成数据库模型与 CRUD 后再开放编辑。
4. 删除无调用者的完整业务 localStorage 读写和旧 cloud 脚本，UI 设置 localStorage 保留。

### 阶段 4：修复名称与设计系统

1. Ipo 增加独立 `nameZh`、`nameEn`，Provider 不再覆盖用户中文名；迁移时从恢复 JSON 回填中文名。
2. 账户页改用统一数据适配层和共享 `StatCard/Card/Section`，但应作为独立视觉任务处理，不与数据恢复混合提交。

## 8. 最终判定

| 审计问题 | 判定 |
| --- | --- |
| 真实数据源 | PostgreSQL + Prisma + API；核心页面不是 localStorage |
| 数据为何停在 6 月 15 日 | 最新迁移 JSON 本身截止 6 月 15 日，后续个人业务记录未迁入 |
| 页面为何可能不读最新数据库 | PWA API cache-first；另有两套统计实现和瞬时 React 导入路径 |
| 页面为何变英文 | HKEX Provider 按 code 更新并覆盖唯一的 `Ipo.name` |
| 账户页为何不统一 | 数据库迁移时独立重写，使用专用 API 和局部组件，绕过共享设计组件 |
