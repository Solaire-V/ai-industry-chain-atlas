# AI 产业链图谱投资导向公司覆盖层设计

## 目标

把当前 AI 产业链图谱从“产业节点说明”升级为“投资导向公司映射”。每个细分节点都要尽量补齐代表公司，并支持后续公司库、行情数据、供需关系、节点库复用。

本次目标不是直接接实时行情，也不是生成投资建议，而是建立可维护、可验证、可排序的公司覆盖数据层。

## 核心原则

### 1. 投资导向优先

公司选择优先满足投资研究需要：

- A 股 / 港股中资公司优先。
- 美股、日韩、欧洲公司作为全球龙头或关键补充。
- 同一节点下，直接相关且产业地位强的公司排在前面。
- 不把弱概念公司放到龙头序列前列。

### 2. 全面覆盖，但分层展示

127 个细分节点都允许挂公司，但不要求全部升级为现有 `AtlasNode` 可投资节点。

现有结构保留：

- `stage subnode`：流程细分节点，用于节点库和主界面拆解。
- `AtlasNode`：深度可投资节点，用于详细技术、壁垒、风险、产业边。

新增覆盖层：

- `SubnodeCompanyCoverage`：细分节点到公司的投资映射，用于显示代表公司、排序依据、证据等级和后续行情联动。

### 3. 证据链优先

每条公司-节点映射必须有来源。优先级：

1. 公司年报、半年报、公告、招股书、投资者关系材料。
2. 公司官网产品页、业务页。
3. 交易所问询回复、监管披露、客户/供应商公开验证。
4. 权威行业报告、协会材料、公开研报交叉验证。
5. 多源媒体报道或市场概念标签只能作为弱证据。

## 数据模型

新增 schema：

```ts
export const subnodeCompanyCoverageSchema = z.object({
  id: requiredStringSchema,
  stageId: atlasStageIdSchema,
  groupId: requiredStringSchema,
  subnodeId: requiredStringSchema,
  companyId: requiredStringSchema,
  rank: z.number().int().positive(),
  priority: z.enum(["leader", "important", "supplementary", "watch"]),
  relevance: z.enum(["direct", "adjacent", "indirect"]),
  evidenceLevel: z.enum(["A", "B", "C", "D"]),
  role: z.string().trim().min(2),
  marketShareNote: z.string().trim().optional(),
  marketCapNote: z.string().trim().optional(),
  sourceIds: z.array(requiredStringSchema).min(1),
});
```

新增到 `AtlasSnapshot`：

```ts
subnodeCompanyCoverages: SubnodeCompanyCoverage[]
```

### 字段含义

- `rank`：同一细分节点内的展示顺序，越小越优先。
- `priority`
  - `leader`：节点龙头或最有代表性的上市公司。
  - `important`：重要参与者，业务相关度高。
  - `supplementary`：补充观察标的，纯度或规模略弱。
  - `watch`：产业相关但投资纯度弱，保留观察。
- `relevance`
  - `direct`：产品/业务直接对应该节点。
  - `adjacent`：与该节点相邻或配套。
  - `indirect`：间接受益或概念相关。
- `evidenceLevel`
  - `A`：公司公告、年报、官网、招股书等一手证据。
  - `B`：监管披露、客户验证、权威报告等强二手证据。
  - `C`：多源研报/媒体交叉验证。
  - `D`：弱证据，仅做候选和观察，不进入龙头前列。
- `marketShareNote`：市占、出货、客户地位、产能等排序依据。
- `marketCapNote`：市值/流动性/市场代表性说明，不写死实时市值。

## 排序规则

同一个细分节点内排序：

1. `relevance = direct` 优先于 `adjacent`，再优先于 `indirect`。
2. `priority = leader` 优先于 `important`，再优先于 `supplementary` 和 `watch`。
3. `evidenceLevel = A` 优先于 `B/C/D`。
4. 有明确市占、出货、客户验证、产能地位的公司优先。
5. A 股 / 港股中资标的优先；海外全球龙头作为补充或对标。
6. 若产业地位接近，再参考市值、流动性和市场代表性。

## 数据补全范围

第一阶段先完成结构和样例数据，避免一次性全量补数据导致难以验收。

### 第一批模块

选择三个模块做结构验证：

1. 材料
2. 设备
3. 光互联

原因：

- 材料和设备是用户多次强调的上游位置。
- 光互联已有较多公司基础，可以验证新旧数据并存。
- 三个模块覆盖材料、设备、组件、系统多种节点类型。

### 第一批数据要求

每个细分节点尽量补：

- 2-5 家 A 股/港股代表公司。
- 0-3 家海外全球龙头或关键公司。
- 至少 1 条来源。
- 排名、优先级、相关度、证据等级。

若节点没有合适上市公司：

- 允许只挂海外/非 A 股全球龙头。
- 允许标记 `watch`。
- 不允许为了凑数加入明显弱相关公司。

### 第二批全量补全

第一批验收后，再覆盖剩余模块：

4. AI 芯片
5. HBM 存储
6. 先进封装
7. 板级系统
8. 服务器网络
9. 算力应用

最终目标是 127 个细分节点都有可解释的公司覆盖状态：

- 已覆盖：有代表公司和证据。
- 弱覆盖：有相关公司，但纯度不高。
- 待补：没有足够上市公司或证据。

## 页面影响

### 节点库

每个细分节点卡片显示：

- Top 3 公司。
- 最高证据等级。
- 覆盖状态：已覆盖 / 弱覆盖 / 待补。

右侧详情显示：

- 公司排序列表。
- 角色说明。
- 相关度、优先级、证据等级。
- 来源链接。

### 公司库

每家公司显示：

- 覆盖的细分节点数。
- 覆盖的主链模块。
- `leader` 节点数量。
- A 股 / 港股 / 美股市场标签。

### 行情数据

行情页后续按公司维度接入：

- 股价、市值、PE、更新时间。
- 不把行情快照写死在覆盖层。
- 覆盖层只提供公司和节点映射，行情层按 `companyId` 动态关联。

### 供需关系

公司覆盖层不等同于供应关系。

- 覆盖层说明“公司参与该节点”。
- 供需关系说明“公司 A 向公司 B 供应某产品/服务”。
- 只有具备供应证据时，才升级到 `supplyRelations`。

## 来源和更新规则

### 来源新增规则

每新增一个公司或覆盖关系，必须同步补来源：

- 若来源是公司官网/年报/公告，优先绑定到相关 coverage。
- 若来源是行业报告或研报，最多支撑 `B/C` 等级。
- 市值、股价、PE 不作为静态来源写死，后续由行情接口更新。

### 最新数据要求

补全时需要联网查证。优先使用：

- 公司官网
- 年报/半年报
- 交易所公告
- 招股书
- 投资者关系材料
- 权威行业报告

检索到的资料必须记录 `checkedAt`。

## 正确性要求

- 所有 `companyId` 必须存在于 `companies`。
- 所有 `sourceIds` 必须存在于 `sources`。
- `stageId/groupId/subnodeId` 必须能在 `atlasStages` 中找到。
- 同一 `stageId/groupId/subnodeId/companyId` 不能重复。
- 同一细分节点内 `rank` 不能重复。
- `evidenceLevel=D` 的公司不能标为 `leader`。
- `relevance=indirect` 的公司不能标为 `leader`。
- 每个覆盖关系必须至少有一个来源。

## 验证

新增测试：

- schema 校验 coverage 引用完整性。
- stage-map 校验 subnode 引用有效。
- repository/API 返回 coverage。
- 节点库能展示细分节点的 Top 公司。
- 公司库能统计 coverage 覆盖数量。

执行：

- `npm run typecheck`
- `npm run test`

## 非目标

本阶段不做：

- 实时行情接入。
- 自动爬虫入库。
- 投资评级或买卖建议。
- 生产部署。
- 数据库 migration，除非后续确认需要服务端持久化。
