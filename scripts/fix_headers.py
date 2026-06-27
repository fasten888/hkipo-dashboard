#!/usr/bin/env python3
"""
fix_headers.py
运行：cd /Users/a24389/Documents/HKIPO-Dashboard && python3 fix_headers.py
"""
import re, os, sys

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def write(p, s):
    with open(p, 'w', encoding='utf-8') as f: f.write(s)

def remove_page_header_block(src: str) -> str:
    """
    把页面内容里多余的 page-header div 变成只含按钮的 justify-end 行。
    处理以下结构（允许左侧 div 为空或已被清空）：

    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        [ eyebrow / h1 / p ]
      </div>
      [ buttons... ]
    </div>

    → 改成:
    <div className="mb-5 flex items-center justify-end gap-2 flex-wrap">
      [ buttons... ]
    </div>
    """

    # Step 1: 删 eyebrow div (旧格式 brand-600 / 新格式 #9CA3AF / text-[#9CA3AF])
    src = re.sub(
        r'\n([ \t]*)<div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-\[0\.16em\] text-(?:brand-600|\[#9CA3AF\])">\n'
        r'(?:[ \t]*<span[^\n]*/>\n)?'
        r'[ \t]*[^\n]+\n'
        r'[ \t]*</div>',
        '', src
    )
    # Step 2: 删 eyebrow p (新格式)
    src = re.sub(r'\n[ \t]*<p className="mb-[12] text-\[11px\][^"]*">[^<\n]+</p>', '', src)

    # Step 3: 删 h1 大标题
    src = re.sub(
        r'\n[ \t]*<h1 className="[^"]*text-(?:2xl|3xl|\[2[0-9]px\])[^"]*">\s*\n?[ \t]*[^<\n]+\n?[ \t]*</h1>',
        '', src
    )
    src = re.sub(
        r'\n[ \t]*<h1 className="[^"]*text-(?:2xl|3xl|\[2[0-9]px\])[^"]*">[^<\n]+</h1>',
        '', src
    )

    # Step 4: 删副标题 p
    src = re.sub(r'\n[ \t]*<p className="mt-[12](?:\.5)? text-(?:sm|\[1[234]px\])[^"]*">[^<\n]+</p>', '', src)
    src = re.sub(r'\n[ \t]*<p className="mt-[12](?:\.5)? text-sm leading-6 [^"]*">[^<\n]+</p>', '', src)

    # Step 5: 把外层 flex header → justify-end，并删掉现在空的左侧 <div></div>
    # 空的左侧 div（内部已被清空，只剩空白）
    src = re.sub(r'\n[ \t]*<div>\s*\n[ \t]*</div>', '', src)

    # 外层 className 替换
    src = re.sub(
        r'className="flex flex-col gap-\d+ sm:flex-row sm:items-end sm:justify-between"',
        'className="mb-5 flex items-center justify-end gap-2 flex-wrap"',
        src
    )

    # Step 6: 删掉 StatisticsPage 没有按钮时整个空的 justify-end div
    src = re.sub(
        r'\n[ \t]*<div className="mb-5 flex items-center justify-end gap-2 flex-wrap">\s*\n[ \t]*</div>',
        '', src
    )

    # Step 7: 去掉第一个 section 多余的 mt-7
    src = re.sub(r'className="mt-7 (grid|rounded|overflow|flex|space)', r'className="\1', src)

    return src


BASE = 'src/features'
FILES = [
    f'{BASE}/statistics/StatisticsPage.tsx',
    f'{BASE}/ipos/IposPage.tsx',
    f'{BASE}/subscriptions/SubscriptionsPage.tsx',
    f'{BASE}/allotments/AllotmentsPage.tsx',
    f'{BASE}/sales/SalesPage.tsx',
    f'{BASE}/withdrawals/WithdrawalsPage.tsx',
    f'{BASE}/exchange/ExchangePage.tsx',
    f'{BASE}/holdings/HoldingsPage.tsx',
    f'{BASE}/accounts/AccountsPage.tsx',
]

print('🎨 统一页面 header 样式（删除重复的 eyebrow/标题/副标题）\n')
changed = 0
for path in FILES:
    if not os.path.exists(path):
        print(f'  ⚠  跳过（不存在）: {path}')
        continue
    orig = read(path)
    result = remove_page_header_block(orig)
    if result != orig:
        write(path, result)
        print(f'  ✅ 已修改: {path}')
        changed += 1
    else:
        print(f'  ○  无需修改: {path}')

print(f'\n共修改 {changed} 个文件。')
print('请运行 npm run dev 验证效果。')
print()
print('⚠  如果某页面标题仍然存在，说明它的格式略有不同。')
print('   请在该文件里手动找到 return 语句后第一个 <div className="flex flex-col gap-...')
print('   把 <div> 里的 eyebrow/h1/p 三块删掉即可。')
