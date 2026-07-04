# AI Industry Chain Atlas

面向产业链研究和投资跟踪的 AI 全产业链图谱。项目从上游材料、半导体设备、AI 芯片、高带宽内存、先进封装、PCB/整机、光互联、服务器网络，到算力应用，提供可视化流程、节点库、公司库、行情状态和供需关系视图。

## 功能

- 主界面：展示 AI 产业链主流程和上下游连接。
- 节点库：按产业环节查看最小节点、代表公司和证据来源。
- 公司库：按市场、产业位置、角色和搜索条件筛选公司。
- 行情数据：预留股价、涨跌幅、PE、市值、PB、PS、成交额等字段。
- 供需关系：展示供应商、客户、产品关系和证据强度。
- 数据设置：展示当前数据源、行情接入状态和上线前检查项。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Supabase Postgres
- Vitest

## 本地运行

```bash
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

## 环境变量

默认使用本地静态数据。若要切换到 Supabase：

```env
ATLAS_DATA_SOURCE=supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-side-key
```

不要把 `.env.local`、service role key、行情源 API key 提交到仓库。

## 数据库初始化

按顺序执行 migration：

```text
supabase/migrations/202606300001_atlas_core.sql
supabase/migrations/202607040001_company_library_phase2.sql
```

生成 seed SQL：

```bash
npm run export:supabase-seed
```

生成文件：

```text
supabase/seed.sql
```

该文件是本地产物，默认不进入 git。

## 验证

```bash
npm run typecheck
npm run test
npm run build
```

## 部署

推荐使用 Vercel + Supabase：

1. 在 Supabase 创建项目并执行 migration / seed。
2. 在 Vercel 导入 GitHub 仓库。
3. 在 Vercel Project Settings 配置服务端环境变量。
4. 部署后检查首页、公司库、行情数据、供需关系和 `/api/atlas/status`。

## 说明

本项目用于产业链研究和个人投资学习，不构成投资建议。行情和估值数据接入前，页面中的行情状态会显示为未接入或占位。
