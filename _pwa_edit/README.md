# 港新账本

本地优先的个人港股打新管理系统，以申购记录为核心，管理账户、新股、中签、分批卖出、出金和收益统计。

## 技术栈

- React + Vite
- TypeScript
- Tailwind CSS
- LocalStorage

## 已实现功能

- 账户管理与账户历史详情
- 新股资料新增、编辑、删除、搜索及批量录入
- 单个申购与多账户批量申购
- 中签状态、股数和手数管理
- 暗盘、首日及其他日期的多次分批卖出
- 账户、新股和系统收益自动统计
- 出金及实际收益管理
- 账户和新股排行、月度趋势
- 六类 CSV 数据导出
- 旧版 LocalStorage 数据自动迁移
- 支持安装到 iPhone、iPad 和 Android 主屏幕
- 安装后支持独立窗口启动及基础离线访问

## 本地运行

```bash
npm install
npm run dev
```

## 部署到手机

项目已经支持 PWA。将 `dist/` 部署到任意 HTTPS 静态网站服务后：

- iPhone：Safari 打开网址，点击“分享” → “添加到主屏幕”
- Android：Chrome 打开网址，点击“安装应用”

当前数据仍使用 LocalStorage，不同设备的数据彼此独立。可通过“数据管理”
导出 JSON，并在另一台设备导入。实时多端同步需要增加云端数据服务。

## 项目结构

```text
src/
├── app/                 # 应用级配置
├── components/          # 通用组件与布局
├── features/            # 按业务模块划分
│   ├── accounts/        # 账户管理与详情
│   ├── dashboard/       # 总览
│   ├── data/            # CSV 导出
│   ├── ipos/            # 新股资料
│   ├── sales/           # 卖出记录
│   ├── statistics/      # 数据统计
│   ├── subscriptions/   # 申购与中签
│   └── withdrawals/     # 出金管理
├── hooks/               # 通用 Hooks
├── pages/               # 页面入口
├── services/            # 本地存储、迁移与导出服务
├── types/               # 公共类型
└── utils/               # 格式化与工具函数
```

业务数据统一保存在 `hkipo-dashboard:data:v2`。首次启动会读取旧版
`accounts:v1`、`ipos:v1` 和 `subscriptions:v1`，自动迁移且不删除旧数据。
