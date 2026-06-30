# 港新账本

个人投资驾驶舱，用于记录港股打新、多账户申购、中签、卖出、出入金、换汇、持仓和收益统计。

项目默认本地运行，不包含任何个人数据。别人拿到 GitHub 仓库或 zip 后，可以直接安装并生成属于自己的空数据库。

## 技术栈

- React + Vite
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- LocalStorage 离线副本
- 可选 Supabase 多设备同步

## 安装

```bash
npm install
```

## 初始化数据库

通常不需要手动执行。第一次运行 `npm run dev` 时，如果本地数据库不存在，项目会自动创建：

```text
✓ First run detected
Creating database...
Creating tables...
Database initialized.
```

如果你想手动初始化，也可以执行：

```bash
npm run db:init
```

`db:push` 也会走同一套安全初始化流程：

```bash
npm run db:push
```

需要直接调试 Prisma CLI 时，可以执行：

```bash
npm run prisma:push
```

## 启动

```bash
npm run dev
```

打开终端输出的网址即可使用。

## 环境变量

仓库提供 `.env.example`，不包含任何私人配置。

如果需要本地环境文件：

```bash
cp .env.example .env
```

默认本地 SQLite 配置：

```env
DATABASE_URL="file:./dev.db"
```

这个路径相对于 `prisma/schema.prisma`，实际数据库文件会创建在：

```text
prisma/dev.db
```

Supabase 云同步是可选功能。只在你需要多设备同步时填写：

```env
VITE_SUPABASE_URL=""
VITE_SUPABASE_PUBLISHABLE_KEY=""
```

## 数据位置

本地 SQLite 数据库：

```text
prisma/dev.db
```

删除这个文件后，再次运行 `npm run dev` 会重新创建一个全新的空数据库。

浏览器离线副本保存在当前浏览器的 LocalStorage 中。换浏览器或清空浏览器数据不会影响其他人的数据库。

## 数据安全

仓库已经忽略所有本地数据库文件：

```gitignore
*.db
*.db-journal
*.sqlite
*.sqlite3
prisma/dev.db
prisma/dev.db-journal
```

因此 GitHub 不会上传你的：

- 账户信息
- 港股打新记录
- 申购记录
- 中签记录
- 卖出记录
- 收益数据
- 出入金和换汇数据

分享项目给别人时，对方第一次启动会得到自己的空数据库。

## 恢复全新状态

如果你想把本机恢复成全新状态：

1. 停止开发服务器。
2. 删除 `prisma/dev.db`。
3. 重新运行：

```bash
npm run dev
```

项目会自动重新创建空数据库。

## 构建与检查

```bash
npm run lint
npm run build
```

## 项目结构

```text
src/
├── app/                 # 应用级配置
├── components/          # 通用组件与布局
├── features/            # 按业务模块划分
│   ├── accounts/        # 账户管理与详情
│   ├── allotments/      # 中签管理
│   ├── dashboard/       # 总览
│   ├── data/            # 数据管理
│   ├── exchange/        # 换汇记录
│   ├── holdings/        # 持仓管理
│   ├── ipos/            # 新股资料
│   ├── sales/           # 卖出记录
│   ├── statistics/      # 数据统计
│   ├── subscriptions/   # 申购记录
│   └── withdrawals/     # 出金管理
├── hooks/               # 通用 Hooks
├── pages/               # 页面入口
├── services/            # 本地存储、同步、迁移与导出服务
├── types/               # 公共类型
└── utils/               # 格式化与工具函数
```

## 分享给别人

对方只需要：

```bash
git clone <repo-url>
cd HKIPO-Dashboard
npm install
npm run dev
```

无需修改代码，无需提前准备数据库。
