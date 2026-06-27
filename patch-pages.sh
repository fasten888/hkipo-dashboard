#!/bin/bash
# 运行路径：项目根目录 /Users/a24389/Documents/HKIPO-Dashboard
# 用法：bash patch-pages.sh
# 作用：将所有 features/ 页面的旧样式批量替换为新 Design System tokens

set -e
FEATURES="src/features"

echo "🎨 开始统一 Design System 样式..."

# ── 1. eyebrow 颜色：brand-600 → text-[#9CA3AF] ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/text-brand-600\b/text-\[#9CA3AF\]/g'

# ── 2. eyebrow 点颜色：bg-brand-500 → bg-\[#9CA3AF\] (only inside eyebrow spans) ──
# 保留按钮里的 bg-brand-600，只改 eyebrow 里的 bg-brand-500 小圆点
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/h-1\.5 w-1\.5 rounded-full bg-brand-500/h-1.5 w-1.5 rounded-full bg-\[#2563EB\]/g'

# ── 3. 页面大标题：text-2xl → text-[28px]，text-3xl → text-[28px] ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl/text-\[28px\] font-bold leading-tight tracking-\[-0.02em\] text-\[#111827\]/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/text-2xl font-bold text-slate-950 sm:text-3xl/text-\[28px\] font-bold leading-tight tracking-\[-0.02em\] text-\[#111827\]/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/text-2xl font-bold text-slate-950/text-\[28px\] font-bold leading-tight tracking-\[-0.02em\] text-\[#111827\]/g'

# ── 4. 副标题颜色：text-slate-500 → text-[#6B7280] ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/mt-2 text-sm text-slate-500/mt-1.5 text-\[13px\] text-\[#6B7280\]/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/mt-2 text-sm leading-6 text-slate-500/mt-1.5 text-\[13px\] text-\[#6B7280\]/g'

# ── 5. 主按钮：旧 brand 按钮 → os-button-primary ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-[45] py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600\/15 transition hover:-translate-y-0\.5 hover:bg-brand-700/os-button-primary/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600\/15/os-button-primary/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white/os-button-primary/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600\/15 transition hover:-translate-y-0\.5 hover:bg-brand-700/os-button-primary/g'

# ── 6. 次按钮：旧 secondary → os-button-secondary ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm/os-button-secondary/g'

# ── 7. 卡片圆角：rounded-2xl border border-slate-200\/80 bg-white p-5 shadow-card → os-card ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-2xl border border-slate-200\/80 bg-white p-5 shadow-card/os-card/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-2xl border border-slate-200 bg-white p-5 shadow-card/os-card/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-2xl border border-slate-200\/80 bg-white px-5 py-5 shadow-card/os-card/g'

# ── 8. 表格容器：rounded-2xl border border-slate-200 bg-white shadow-card → 新样式 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/overflow-hidden rounded-2xl border border-slate-200\/80 bg-white shadow-card/overflow-hidden rounded-\[16px\] border border-\[#EEF2F7\] bg-white shadow-card/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card/overflow-hidden rounded-\[16px\] border border-\[#EEF2F7\] bg-white shadow-card/g'

# ── 9. 输入框容器卡片 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-2xl border border-slate-200\/80 bg-white p-4 shadow-card/os-card/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-2xl border border-slate-200 bg-white p-4 shadow-card/os-card/g'

# ── 10. 输入框：focus-ring w-full rounded-xl border border-slate-200 → os-input w-full ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/focus-ring w-full rounded-xl border border-slate-200 py-2\.5 pl-10 pr-4 text-sm/os-input w-full pl-9/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/focus-ring w-full rounded-xl border border-slate-200 py-2\.5 pl-10 pr-4 text-sm/os-input w-full pl-9/g'

# ── 11. select 统一 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-xl border border-slate-200 bg-white px-3\.5 py-2\.5 text-sm text-slate-600/os-input/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/rounded-xl border border-slate-200 bg-white px-3\.5 py-2\.5 text-sm/os-input/g'

# ── 12. 表头背景 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/border-b border-slate-100 bg-slate-50\/70/border-b border-\[#EEF2F7\] bg-\[#F8FAFC\]/g'
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/bg-slate-50 text-left text-xs text-slate-500/bg-\[#F8FAFC\] text-left text-\[11px\] text-\[#6B7280\]/g'

# ── 13. 表格分割线 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/divide-y divide-slate-100/divide-y divide-\[#EEF2F7\]/g'

# ── 14. section 标题 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/font-bold text-slate-900/text-\[15px\] font-semibold text-\[#111827\]/g'

# ── 15. toast 通知 ──
find "$FEATURES" -name "*.tsx" | xargs sed -i '' \
  's/fixed bottom-5 left-1\/2 z-\[80\] -translate-x-1\/2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-xl/fixed bottom-5 left-1\/2 z-[80] -translate-x-1\/2 rounded-\[10px\] bg-\[#111827\] px-4 py-3 text-\[13px\] font-medium text-white shadow-xl/g'

echo "✅ 样式批量替换完成！请运行 npm run dev 验证效果。"
echo ""
echo "⚠️  以下文件已单独重写，请手动替换："
echo "   src/features/accounts/AccountsPage.tsx  →  AccountsPage.tsx（已提供）"
echo "   src/features/ipos/IposPage.tsx           →  IposPage.tsx（已提供）"
echo "   src/features/withdrawals/WithdrawalsPage.tsx → WithdrawalsPage.tsx（已提供）"
