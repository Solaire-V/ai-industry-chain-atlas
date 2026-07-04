# 第三阶段部署与每日更新 Runbook

## 结论

推荐路线是 Vercel + Supabase Postgres。当前代码已经具备只读公开访问、Supabase 数据读取切换、静态 seed SQL 生成、行情更新框架和数据新鲜度状态接口。真正上线前还需要人工完成 Supabase 项目创建、migration 执行、seed 导入、环境变量配置、行情源选择和 Vercel 部署。

本文档不记录任何密钥、token、账号或真实环境变量值。

## 当前已具备

| 能力 | 入口 |
|---|---|
| 静态默认数据源 | `fixtureAtlasRepository` |
| Supabase 数据源切换 | `ATLAS_DATA_SOURCE=supabase` |
| 数据库读取映射 | `lib/atlas/supabase-repository.ts` |
| 静态 seed SQL 生成 | `lib/atlas/supabase-seed-sql.ts` |
| 行情更新框架 | `lib/atlas/market-update.ts` |
| 数据新鲜度摘要 | `lib/atlas/data-freshness.ts` |
| 公开只读状态 API | `/api/atlas/status` |

## 下一步 TODO

### P0：本地验收闭环

- [ ] 主界面：确认产业链主流程、节点连接、右侧详情信息满足投研阅读。
- [ ] 节点库：抽查每个主链模块下的最小节点、公司覆盖、A股/其他市场分组。
- [ ] 公司库：抽查搜索、市场筛选、产业环节筛选、公司详情、供需摘要。
- [ ] 行情数据：确认静态占位、已有样例行情、估值字段展示方式不会误导为实时数据。
- [ ] 供需关系：确认公司供需表和产业链边表能回答“谁供给谁、供什么、证据强弱”。
- [ ] 数据设置：确认只展示状态和上线前阻塞项，不暴露任何密钥输入或真实环境变量值。

### P1：上线前数据准备

- [ ] 选择行情源，确认 A股/港股/美股覆盖、展示授权、调用频率、成本和字段口径。
- [ ] 明确生产数据库初始化方式：Supabase CLI 或 SQL Editor 手工执行。
- [ ] 生成并导入当前静态 seed，保证公司、节点、覆盖关系、供需关系不分叉。
- [ ] 抽查 Supabase 数据源下 `/api/atlas` 与 `/api/atlas/status` 返回结构。
- [ ] 确定每日更新失败策略：保留最近一次成功行情，状态页提示 stale。

### P2：公开部署

- [ ] 创建 Vercel 项目并绑定仓库。
- [ ] 在 Vercel 后台配置生产环境变量，不写入仓库。
- [ ] 执行生产 migration 前做备份和单独确认。
- [ ] 首次部署后检查首页、公司库、行情数据、供需关系、状态 API。
- [ ] 注册定时更新任务前完成 cron secret、调用额度和失败告警设计。

## 生产环境变量

只在服务端部署平台配置，不写入仓库，不写入 `.env`。

| 变量 | 用途 | 前端可见 |
|---|---|---|
| `ATLAS_DATA_SOURCE` | 设置为 `supabase` 后启用数据库读取 | 否 |
| `SUPABASE_URL` | Supabase 项目 URL | 否 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端读取和后续写入更新任务 | 否 |
| `MARKET_DATA_PROVIDER` | 后续选择行情源后使用 | 否 |
| `MARKET_DATA_API_KEY` | 行情源服务端密钥 | 否 |
| `ATLAS_CRON_SECRET` | 定时更新 API 鉴权 | 否 |

说明：如果后续只让浏览器读取公开只读数据，可评估 `NEXT_PUBLIC_SUPABASE_URL` 和 anon key。但当前建议仍由 Next.js server route 统一读取，避免前端直接耦合数据库表结构。

## Supabase 初始化

### 1. 创建项目

在 Supabase 创建 Postgres 项目，记录项目 URL 和服务端 key。不要把 key 复制到代码、文档或聊天记录里。

### 2. 执行 migration

按文件名顺序执行：

```bash
supabase db push
```

如果不使用 Supabase CLI，则在 Supabase SQL Editor 中按顺序执行：

1. `supabase/migrations/202606300001_atlas_core.sql`
2. `supabase/migrations/202607040001_company_library_phase2.sql`

执行后检查：

- 所有公开表已启用 RLS。
- 公开读取 policy 只允许 published/非投机数据。
- `market_snapshots` 有 `market_cap`、`pb`、`ps`、`turnover`、`source_id` 字段。
- `company_node_roles.slug` 和 `supply_relations.slug` 存在唯一索引。

### 3. 导入当前静态 seed

先在本地生成 seed SQL，再人工导入 Supabase。

建议后续补一个 CLI 脚本调用 `buildSupabaseSeedSql(verticalSlice)` 输出 SQL 文件。当前不要用手写 SQL 复制业务数据，避免公司和节点映射分叉。

导入后检查：

- `companies` 数量与本地公司库一致。
- `subnode_company_coverages` 覆盖所有节点库最小节点。
- `/api/atlas/status` 在 `ATLAS_DATA_SOURCE=supabase` 下返回正常 JSON。

## Vercel 部署

### 1. 项目设置

推荐：

- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: 默认
- Output Directory: 默认

### 2. 环境变量

在 Vercel Project Settings 配置生产环境变量：

- `ATLAS_DATA_SOURCE`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

第三阶段真实接行情前再增加：

- `MARKET_DATA_PROVIDER`
- `MARKET_DATA_API_KEY`
- `ATLAS_CRON_SECRET`

### 3. 部署前验证

本地必须通过：

```bash
npm run typecheck
npm run test
npm run build
```

部署后检查：

- 首页可访问。
- 公司库可搜索、筛选、打开详情。
- `/api/atlas/status` 可访问且不包含任何密钥字符串。
- 浏览器 Network 响应不出现 `SUPABASE_SERVICE_ROLE_KEY`、行情源 key 或 cron secret。

## 每日行情更新设计

当前代码提供 `runMarketSnapshotUpdate`，后续真实接入时只需要补一个 provider：

```ts
const provider = {
  id: "selected-provider",
  async fetchLatest(companies) {
    // 调用服务端行情源，返回 MarketQuote[]
  },
};
```

写入流程：

1. 创建 `update_runs` running 记录。
2. 从行情源读取公司最新行情。
3. 通过 company slug 解析数据库 UUID。
4. upsert `market_snapshots`。
5. 写入 `update_runs` succeeded 或 failed。
6. 失败信息脱敏后写入数据库。

后续 cron route 建议形态：

```text
POST /api/atlas/admin/refresh-market
Authorization: Bearer <ATLAS_CRON_SECRET>
```

约束：

- 只允许 POST。
- 必须校验 `ATLAS_CRON_SECRET`。
- 不在响应里返回 provider 原始错误和密钥。
- 失败时保留最近一次成功行情数据，页面通过新鲜度状态提示“行情需更新”。

## 行情数据源待决策

选择行情源前先确认：

- A股、港股、美股覆盖范围。
- 是否允许公开网站展示。
- 是否支持 PE TTM、市值、PB、PS、成交额。
- 免费/付费额度和调用频率。
- 数据延迟说明和交易日字段定义。

不建议在未确认授权前抓取网页或使用不稳定接口作为生产数据源。

## 回滚

### 网站回滚

在 Vercel 回滚到上一个生产部署。

### 数据回滚

优先通过 `published=false` 隐藏异常数据，不直接删除生产数据。确需删除或迁移时，必须先备份并单独确认。

### 行情更新停用

关闭 Vercel Cron 或移除 cron route 的 secret。页面会继续展示最近一次成功行情，并通过 `/api/atlas/status` 反映 stale 状态。

## 上线前阻塞项

| 阻塞项 | 原因 |
|---|---|
| 选择行情源 | 涉及授权、覆盖范围和成本 |
| 配置生产密钥 | 涉及 `.env` / Vercel 环境变量红线 |
| 执行生产 migration | 涉及数据库 schema 变更 |
| 执行公开部署 | 属于公开发布红线 |
| 注册定时任务 | 会触发真实外部调用和数据库写入 |
