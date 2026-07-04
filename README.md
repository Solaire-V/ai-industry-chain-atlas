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

行情刷新端点默认关闭真实 provider。仅启用受保护入口时：

```env
CRON_SECRET=your-refresh-secret
MARKET_DATA_PROVIDER=disabled
```

A 股主 provider 候选使用同花顺金融数据 API / Fuyao：

```env
MARKET_DATA_PROVIDER=hithink-fuyao
HITHINK_FUYAO_API_KEY=your-fuyao-key
```

也兼容 `FUYAO_TOKEN` 或 `API_KEY`。推荐项目内统一使用 `HITHINK_FUYAO_API_KEY`，避免和其他服务的通用 `API_KEY` 混淆。

`ATLAS_CRON_SECRET` 可作为项目级额外密钥；如果同时配置，`CRON_SECRET` 和 `ATLAS_CRON_SECRET` 都可用于授权刷新。

不要把 `.env.local`、service role key、行情源 API key 提交到仓库。

## 行情刷新接口

刷新接口已预留 HiThink/Fuyao A 股行情 provider。没有 provider key 时不会访问外部网络，也不会写入行情表。接口：

```text
GET  /api/atlas/admin/refresh-market
POST /api/atlas/admin/refresh-market
```

- `GET`：预留给 Vercel Cron。Vercel Cron 会请求生产部署 URL 的配置路径。
- `POST`：预留给手工脚本或后台按钮。
- 两者都必须带 `Authorization: Bearer <CRON_SECRET>`。
- `?dryRun=1` 只检查鉴权、provider 状态和公司数量，不写入行情表。

本地 dry-run 示例：

```bash
curl -X POST "http://localhost:3000/api/atlas/admin/refresh-market?dryRun=1" \
  -H "Authorization: Bearer $CRON_SECRET"
```

当前响应会是 `dry_run`、`provider_disabled`、`provider_not_configured`、`market_update_succeeded`、`market_update_failed` 或 `provider_not_implemented`。配置 `MARKET_DATA_PROVIDER=hithink-fuyao`、Fuyao key、`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 后，刷新接口会通过统一更新链路写入 `market_snapshots` 并记录 `update_runs`。HiThink/Fuyao 当前用于 A 股行情快照字段映射；新闻、公告全文、研报不在该 provider 能力内，后续应单独接公告/事件 provider。

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

未来启用 Vercel Cron 时再添加 `vercel.json`，例如：

```json
{
  "crons": [
    {
      "path": "/api/atlas/admin/refresh-market",
      "schedule": "0 22 * * *"
    }
  ]
}
```

Vercel Cron 使用 UTC 时间；启用前需要先配置 `CRON_SECRET` 和真实 `MARKET_DATA_PROVIDER`。

## 说明

本项目用于产业链研究和个人投资学习，不构成投资建议。行情和估值数据接入前，页面中的行情状态会显示为未接入或占位。
