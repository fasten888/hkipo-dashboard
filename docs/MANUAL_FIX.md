# 各页面需要手动删除的代码块

## 操作说明
打开对应文件，找到 `return (` 后的第一个大 div，
删除其中的 **左侧标题区 `<div>...</div>`**，只保留右侧按钮。

外层容器从：
```
<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
```
改成：
```
<div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
```

---

## 1. StatisticsPage.tsx
**文件**：`src/features/statistics/StatisticsPage.tsx`

**删除整块**（在 return 内，第一个 `<div>` 块）：
```tsx
<div>
  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
    V1 · 分析中心
  </div>
  <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
    数据统计
  </h1>
  <p className="mt-2 text-sm text-slate-500">
    对比账户和新股表现，观察月度收益与参与趋势。
  </p>
</div>
```

**同时**，把外层 div 从：
```tsx
<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
  <div>...</div>   ← 整块删除
</div>
```

因为 StatisticsPage 没有顶部按钮，**整个外层 header div 都可以删掉**：
```tsx
// 删除这整个块（约6行）：
<>
  <div>
    <div className="mb-2 ...">...</div>
    <h1 ...>数据统计</h1>
    <p ...>对比账户...</p>
  </div>
```
改成直接从 `<section className="mt-7 grid...">` 开始。

---

## 2. IposPage.tsx
**文件**：`src/features/ipos/IposPage.tsx`

**删除左侧标题 div**，只保留右侧按钮 div，外层容器改为 justify-end：

删除：
```tsx
<div>
  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
    V1 · 基础资料
  </div>
  <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
    新股资料
  </h1>
  <p className="mt-2 text-sm text-slate-500">
    维护新股发行资料，并查看参与账户、中签和收益表现。
  </p>
</div>
```

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" className="os-button-secondary" onClick={() => setBatchOpen(true)}>批量录入</button>
  <button type="button" className="os-button-primary gap-2" onClick={...}>
    <Plus size={15} />新增新股
  </button>
</div>
```

---

## 3. SubscriptionsPage.tsx
**文件**：`src/features/subscriptions/SubscriptionsPage.tsx`

删除左侧标题 div（含 V1 · 核心业务 eyebrow + 申购记录 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
  {canUndoSubscriptionBatch && <button ... >撤销批量操作</button>}
  <button ... >批量编辑</button>
  <button ... >批量申购</button>
  <button ... >新增申购</button>
</div>
```

---

## 4. AllotmentsPage.tsx
**文件**：`src/features/allotments/AllotmentsPage.tsx`

删除左侧标题 div（含 V1 · 结果管理 eyebrow + 中签管理 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" className="os-button-primary gap-2" onClick={() => setBatchOpen(true)}>
    <ListChecks size={15} />批量录入结果
  </button>
</div>
```

---

## 5. SalesPage.tsx
**文件**：`src/features/sales/SalesPage.tsx`

删除左侧标题 div（含 V1 · 交易记录 eyebrow + 卖出记录 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" className="os-button-primary gap-2" onClick={openAddSale}>
    <Plus size={15} />新增卖出
  </button>
</div>
```

---

## 6. WithdrawalsPage.tsx
**文件**：`src/features/withdrawals/WithdrawalsPage.tsx`

删除左侧标题 div（含 V1 · 资金管理 eyebrow + 出金管理 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" disabled={accounts.length === 0} className="os-button-primary gap-2" onClick={...}>
    <Plus size={15} />记录出金
  </button>
</div>
```

---

## 7. ExchangePage.tsx
**文件**：`src/features/exchange/ExchangePage.tsx`

删除左侧标题 div（含人民币口径资金分析 eyebrow + 换汇管理 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" disabled={accounts.length === 0} className="os-button-primary gap-2" onClick={...}>
    <Plus size={15} />新增换汇
  </button>
</div>
```

---

## 8. HoldingsPage.tsx
**文件**：`src/features/holdings/HoldingsPage.tsx`

删除左侧标题 div（含抵押融资能力 eyebrow + 持仓管理 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" disabled={data.accounts.length === 0} className="os-button-primary gap-2" onClick={...}>
    <Plus size={15} />新增持仓
  </button>
</div>
```

---

## 9. AccountsPage.tsx
**文件**：`src/features/accounts/AccountsPage.tsx`

删除左侧标题 div（含 V1 · 账户中心 eyebrow + 账户管理 h1 + 副标题）。

把外层改为：
```tsx
<div className="mb-5 flex items-center justify-end gap-2">
  <button type="button" className="os-button-primary gap-2" onClick={...}>
    <Plus size={15} />新增账户
  </button>
</div>
```

---

## 统一规则总结

所有页面内容区 return 语句的**第一个元素**从：

```tsx
<div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
  <div>
    {/* eyebrow */}
    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      V1 · xxx
    </div>
    {/* 大标题 */}
    <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">页面标题</h1>
    {/* 副标题 */}
    <p className="mt-2 text-sm text-slate-500">副标题文字</p>
  </div>
  {/* 按钮 */}
  <button ...>xxx</button>
</div>
```

改成：

```tsx
<div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
  {/* 只保留按钮 */}
  <button ...>xxx</button>
</div>
```

**无按钮的页面**（如 StatisticsPage）直接把整个外层 header div 删掉。
