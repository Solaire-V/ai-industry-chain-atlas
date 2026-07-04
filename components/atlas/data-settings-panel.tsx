import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSource,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";

interface DataSettingsPanelProps {
  companies: readonly AtlasCompany[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  sources: readonly AtlasSource[];
}

export function DataSettingsPanel({
  companies,
  marketSnapshots,
  supplyRelations,
  subnodeCompanyCoverages,
  sources,
}: DataSettingsPanelProps) {
  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="数据设置">
      <header>
        <h1>数据设置</h1>
        <p>本地只展示数据状态和上线前检查项；密钥、数据库写入和部署配置不在浏览器里编辑。</p>
      </header>

      <div className="workspace-status-grid" aria-label="本地数据状态">
        <article>
          <strong>本地展示数据</strong>
          <small>{companies.length} 公司 · {subnodeCompanyCoverages.length} 节点公司映射</small>
        </article>
        <article>
          <strong>Supabase 可切换</strong>
          <small>设置 ATLAS_DATA_SOURCE=supabase 后由服务端读取数据库</small>
        </article>
        <article data-state={marketSnapshots.length ? "ready" : "partial"}>
          <strong>每日更新框架</strong>
          <small>{marketSnapshots.length} 行情快照 · 真实行情源待选择</small>
        </article>
        <article>
          <strong>/api/atlas/status</strong>
          <small>公开只读状态接口，用于检查数据新鲜度</small>
        </article>
      </div>

      <div className="workspace-checklist" aria-label="上线前阻塞项">
        <h2>上线前阻塞项</h2>
        <ul>
          <li>选择合法可展示的 A股 / 港股 / 美股行情源</li>
          <li>在部署平台配置服务端环境变量，不写入仓库</li>
          <li>人工执行 Supabase migration 和 seed 导入</li>
          <li>注册带鉴权的每日行情更新任务</li>
          <li>部署后检查页面、状态 API 和浏览器响应无密钥泄漏</li>
        </ul>
      </div>

      <div className="workspace-status-grid" aria-label="证据数据状态">
        <article>
          <strong>{supplyRelations.length} 条供需关系</strong>
          <small>高可信关系优先人工维护</small>
        </article>
        <article>
          <strong>{sources.length} 条证据来源</strong>
          <small>节点、公司和供需关系共用来源表</small>
        </article>
      </div>
    </section>
  );
}
