import {
  getNeighborhood,
  type RelationshipMode,
} from "@/lib/atlas/graph";
import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasNode,
} from "@/lib/atlas/schema";

const posterSections: ReadonlyArray<{
  id: string;
  title: string;
  subtitle: string;
  tone: "amber" | "green" | "blue" | "pink" | "purple";
  nodeIds: readonly string[];
}> = [
  {
    id: "upstream",
    title: "上游基础材料",
    subtitle: "光、电、板材的关键输入",
    tone: "amber",
    nodeIds: [
      "inp-material",
      "silicon-photonics-material",
      "optical-fiber-preform",
      "low-loss-ccl",
    ],
  },
  {
    id: "chips",
    title: "核心芯片与器件",
    subtitle: "AI 计算、存储、交换与光电器件",
    tone: "blue",
    nodeIds: [
      "optical-chip",
      "laser",
      "modulator",
      "tia-driver",
      "optical-dsp",
      "switch-asic",
      "hbm",
    ],
  },
  {
    id: "interconnect",
    title: "高速互联与 CPO",
    subtitle: "从可插拔光模块到共封装光学",
    tone: "green",
    nodeIds: [
      "fa-mpo",
      "high-layer-pcb",
      "pluggable-optics",
      "optical-engine",
      "cpo",
    ],
  },
  {
    id: "systems",
    title: "网络与服务器",
    subtitle: "把芯片和互联装进系统",
    tone: "purple",
    nodeIds: ["ethernet-switch", "ai-server"],
  },
  {
    id: "facilities",
    title: "算力设施",
    subtitle: "大规模训练与推理的落地载体",
    tone: "pink",
    nodeIds: ["ai-cluster"],
  },
];

const nodeIconById: Readonly<Record<string, string>> = {
  "inp-material": "🐿️",
  "silicon-photonics-material": "🧪",
  "optical-fiber-preform": "🧵",
  "low-loss-ccl": "🧩",
  "optical-chip": "🐧",
  laser: "🔦",
  modulator: "🎚️",
  "tia-driver": "🔌",
  "optical-dsp": "🧠",
  "switch-asic": "🦊",
  hbm: "🐰",
  "fa-mpo": "🐱",
  "high-layer-pcb": "🐿️",
  "pluggable-optics": "🐶",
  "optical-engine": "🐻",
  cpo: "⭐",
  "ethernet-switch": "🦁",
  "ai-server": "🐼",
  "ai-cluster": "☁️",
};

const relationshipTypeLabels: Readonly<
  Record<AtlasIndustryEdge["type"], string>
> = {
  supply: "供给",
  integrate: "集成",
  deploy: "部署",
};

interface PosterAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  mode: RelationshipMode;
  selectedNodeId: string | null;
  empty: boolean;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

export function PosterAtlasCanvas({
  nodes,
  companies,
  edges,
  mode,
  selectedNodeId,
  empty,
  onSelectNode,
  onResetSearch,
}: PosterAtlasCanvasProps) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const nodeIdSet = new Set(nodes.map(({ id }) => id));
  const visibleEdges = edges.filter(
    ({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to),
  );
  const related = selectedNodeId
    ? getNeighborhood(selectedNodeId, visibleEdges)
    : null;
  const visibleSections = posterSections
    .map((section) => ({
      ...section,
      nodes: section.nodeIds.flatMap((nodeId) => {
        const node = nodeById.get(nodeId);
        return node ? [node] : [];
      }),
    }))
    .filter(({ nodes }) => nodes.length > 0);

  return (
    <section className="poster-workspace" aria-label="AI 算力产业链全景图谱画布">
      <div className="poster-scroll">
        {empty ? (
          <div className="poster-empty">
            <p>没有找到匹配的节点或公司</p>
            <button type="button" onClick={onResetSearch}>
              重置搜索
            </button>
          </div>
        ) : (
          <article className="poster-sheet">
            <header className="poster-hero">
              <span className="poster-mascot" aria-hidden="true">🐕</span>
              <div>
                <p>2026 年最新 · 数据可更新</p>
                <h1>AI 算力产业链全景图谱</h1>
                <small>从上游材料、芯片器件、高速互联，到服务器、集群与应用落地</small>
              </div>
              <span className="poster-mascot" aria-hidden="true">🐰</span>
            </header>

            <div className="poster-flow-legend" aria-hidden="true">
              <span>💡 上游基础</span>
              <i />
              <span>🧠 核心芯片</span>
              <i />
              <span>🔌 高速互联</span>
              <i />
              <span>☁️ 算力落地</span>
              <i />
              <span>📈 产业价值</span>
            </div>

            <div className="visually-hidden" aria-label="可见产业关系">
              <h2>可见产业关系</h2>
              <ul>
                {visibleEdges.map((edge) => (
                  <li key={`summary-${edge.id}`}>
                    {nodeById.get(edge.from)?.name ?? edge.from} → {nodeById.get(edge.to)?.name ?? edge.to}（{relationshipTypeLabels[edge.type]}）
                  </li>
                ))}
              </ul>
            </div>

            <div className="poster-sections">
              {visibleSections.map((section, sectionIndex) => (
                <section
                  className="poster-section"
                  data-tone={section.tone}
                  key={section.id}
                >
                  <header className="poster-section-title">
                    <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.subtitle}</p>
                    </div>
                  </header>
                  <div className="poster-card-grid">
                    {section.nodes.map((node) => {
                      const isSelected = node.id === selectedNodeId;
                      const isRelated = related ? related.has(node.id) : true;
                      const leaders = node.companyIds
                        .map((companyId) => companyById.get(companyId))
                        .filter((company): company is AtlasCompany => Boolean(company))
                        .slice(0, 3);
                      return (
                        <button
                          key={node.id}
                          id={`atlas-node-${node.id}`}
                          className="poster-node-card"
                          type="button"
                          aria-label={`${node.name} 产业节点`}
                          aria-pressed={isSelected}
                          data-testid={`node-${node.id}`}
                          data-selected={isSelected}
                          data-related={isRelated}
                          onClick={() => onSelectNode(node.id)}
                        >
                          <span className="poster-node-index">
                            {String(posterSections.flatMap(({ nodeIds }) => nodeIds).indexOf(node.id) + 1).padStart(2, "0")}
                          </span>
                          <span className="poster-node-icon" aria-hidden="true">
                            {nodeIconById[node.id] ?? "✨"}
                          </span>
                          <strong>{node.name}</strong>
                          <small>{leaders.map(({ name }) => name).join(" · ")}</small>
                          <em>{node.summary}</em>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              <section className="poster-section poster-section-future" data-tone="blue">
                <header className="poster-section-title">
                  <span>+</span>
                  <div>
                    <h2>下游应用与产业价值</h2>
                    <p>云厂商、模型平台、AI 应用、算力租赁等待扩展</p>
                  </div>
                </header>
                <div className="poster-future-card">
                  <span aria-hidden="true">🧭</span>
                  <p>这一层需要继续补充可核验公司、供需关系和行情字段；当前版本不伪造未核验节点。</p>
                </div>
              </section>
            </div>

            <footer className="poster-footnote">
              <span>点击任意卡片查看技术解释、代表公司和来源证据</span>
              <span>关系模式：{mode === "all" ? "全部关系" : mode === "value" ? "包含/部署关系" : "直接供给关系"}</span>
            </footer>
          </article>
        )}
      </div>
    </section>
  );
}
