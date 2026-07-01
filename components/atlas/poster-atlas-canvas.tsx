import { getNeighborhood } from "@/lib/atlas/graph";
import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasNode,
} from "@/lib/atlas/schema";

const orderedNodeIds = [
  "inp-material",
  "silicon-photonics-material",
  "optical-fiber-preform",
  "low-loss-ccl",
  "hbm",
  "high-layer-pcb",
  "switch-asic",
  "optical-chip",
  "laser",
  "modulator",
  "tia-driver",
  "optical-dsp",
  "fa-mpo",
  "optical-engine",
  "cpo",
  "pluggable-optics",
  "ai-server",
  "ethernet-switch",
  "ai-cluster",
] as const;

const nodeIndexById: ReadonlyMap<string, number> = new Map(
  orderedNodeIds.map((nodeId, index) => [nodeId, index + 1]),
);

const nodeIconById: Readonly<Record<string, string>> = {
  "inp-material": "InP",
  "silicon-photonics-material": "SOI",
  "optical-fiber-preform": "Fiber",
  "low-loss-ccl": "CCL",
  hbm: "HBM",
  "high-layer-pcb": "PCB",
  "switch-asic": "ASIC",
  "optical-chip": "PIC",
  laser: "Laser",
  modulator: "MOD",
  "tia-driver": "TIA",
  "optical-dsp": "DSP",
  "fa-mpo": "MPO",
  "optical-engine": "OE",
  cpo: "CPO",
  "pluggable-optics": "OSFP",
  "ai-server": "Server",
  "ethernet-switch": "Switch",
  "ai-cluster": "Cluster",
};

const relationshipTypeLabels: Readonly<
  Record<AtlasIndustryEdge["type"], string>
> = {
  supply: "供给",
  integrate: "集成",
  deploy: "部署",
};

const materialLanes: ReadonlyArray<{
  title: string;
  summary: string;
  nodeIds: readonly string[];
  target: string;
}> = [
  {
    title: "晶圆 / 衬底材料",
    summary: "InP、SOI 等材料进入光芯片、激光器和硅光平台。",
    nodeIds: ["inp-material", "silicon-photonics-material"],
    target: "光芯片 / 激光器",
  },
  {
    title: "PCB / 高频材料",
    summary: "低损耗 CCL、铜箔和树脂决定高速板卡插损与可靠性。",
    nodeIds: ["low-loss-ccl"],
    target: "高速 PCB / 服务器板卡",
  },
  {
    title: "光通信材料",
    summary: "光纤预制棒、光纤与连接材料支撑数据中心光链路。",
    nodeIds: ["optical-fiber-preform"],
    target: "光纤阵列 / 光模块",
  },
  {
    title: "封装材料",
    summary: "ABF 载板、底填胶、焊球、TIM 等是先进封装的物料输入。",
    nodeIds: [],
    target: "CoWoS / 2.5D / 3D 封装",
  },
];

const mainChain: ReadonlyArray<{
  title: string;
  summary: string;
  nodeIds: readonly string[];
  virtualItems?: readonly string[];
}> = [
  {
    title: "AI 芯片 / HBM",
    summary: "计算芯片提供算力，HBM 提供高带宽内存。",
    nodeIds: ["hbm"],
    virtualItems: ["GPU / AI 加速器"],
  },
  {
    title: "先进封装",
    summary: "把计算芯片、HBM 与高速互联在封装层缩短距离。",
    nodeIds: [],
    virtualItems: ["CoWoS / 2.5D / 3D"],
  },
  {
    title: "板级高速连接",
    summary: "PCB、连接器和 SerDes 组织服务器与交换机内部电连接。",
    nodeIds: ["high-layer-pcb"],
    virtualItems: ["高速连接器"],
  },
  {
    title: "交换 ASIC",
    summary: "负责 AI 集群横向扩展网络里的包转发与拥塞调度。",
    nodeIds: ["switch-asic"],
  },
  {
    title: "光电器件",
    summary: "光芯片、激光器、调制器、TIA 和 DSP 完成光电转换。",
    nodeIds: ["optical-chip", "laser", "modulator", "tia-driver", "optical-dsp"],
  },
  {
    title: "光引擎 / CPO / 光模块",
    summary: "CPO 缩短交换芯片到光引擎的电走线，可插拔模块负责面板侧标准化接入。",
    nodeIds: ["optical-engine", "cpo", "pluggable-optics", "fa-mpo"],
  },
  {
    title: "服务器 / 交换机",
    summary: "AI 服务器承载加速器，交换机把节点组织成训练与推理网络。",
    nodeIds: ["ai-server", "ethernet-switch"],
  },
  {
    title: "集群 / 应用",
    summary: "大规模服务器、网络、电力和冷却共同形成可用算力。",
    nodeIds: ["ai-cluster"],
    virtualItems: ["云厂商 / AIDC", "模型训练 / 推理", "AI 应用"],
  },
];

const equipmentLanes: ReadonlyArray<{
  title: string;
  summary: string;
  target: string;
}> = [
  {
    title: "半导体前道设备",
    summary: "光刻、刻蚀、薄膜沉积、离子注入、CMP、清洗、量测。",
    target: "AI 芯片 / 光芯片",
  },
  {
    title: "先进封装设备",
    summary: "键合、切割、贴片、检测与 CoWoS / 2.5D / 3D 相关设备。",
    target: "先进封装 / HBM",
  },
  {
    title: "PCB 制造设备",
    summary: "钻孔、电镀、压合、曝光、AOI 与高速板可靠性检测。",
    target: "高速 PCB",
  },
  {
    title: "光模块 / CPO 设备",
    summary: "光耦合、精密贴装、封装、老化和高速测试设备。",
    target: "光引擎 / CPO / 光模块",
  },
];

const keyConnectionLabels = [
  "磷化铟衬底 → 光芯片",
  "硅光子衬底材料 → 光芯片",
  "低损耗覆铜板 → 高多层高速 PCB",
  "光纤预制棒 → 光纤阵列与 MPO",
  "光引擎 → 共封装光学",
  "共封装光学 → AI 以太网交换机",
  "可插拔光模块 → AI 以太网交换机",
  "AI 服务器 + AI 以太网交换机 → AI 计算集群",
] as const;

interface PosterAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  selectedNodeId: string | null;
  empty: boolean;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

interface NodeButtonProps {
  node: AtlasNode;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function NodeButton({
  node,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: NodeButtonProps) {
  const isSelected = node.id === selectedNodeId;
  const isRelated = related ? related.has(node.id) : true;
  const leaders = node.companyIds
    .map((companyId) => companies.get(companyId))
    .filter((company): company is AtlasCompany => Boolean(company))
    .slice(0, 3);

  return (
    <button
      id={`atlas-node-${node.id}`}
      className="system-node"
      type="button"
      aria-label={`${node.name} 产业节点`}
      aria-pressed={isSelected}
      data-testid={`node-${node.id}`}
      data-selected={isSelected}
      data-related={isRelated}
      onClick={() => onSelectNode(node.id)}
    >
      <span className="system-node-index">
        {String(nodeIndexById.get(node.id) ?? 0).padStart(2, "0")}
      </span>
      <span className="system-node-code">{nodeIconById[node.id] ?? "Node"}</span>
      <strong>{node.name}</strong>
      <small>{leaders.map(({ name }) => name).join(" · ")}</small>
    </button>
  );
}

interface NodeListProps {
  nodeIds: readonly string[];
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function NodeList({
  nodeIds,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: NodeListProps) {
  const visibleNodes = nodeIds.flatMap((nodeId) => {
    const node = nodes.get(nodeId);
    return node ? [node] : [];
  });

  if (visibleNodes.length === 0) return null;

  return (
    <div className="system-node-list">
      {visibleNodes.map((node) => (
        <NodeButton
          key={node.id}
          node={node}
          companies={companies}
          selectedNodeId={selectedNodeId}
          related={related}
          onSelectNode={onSelectNode}
        />
      ))}
    </div>
  );
}

export function PosterAtlasCanvas({
  nodes,
  companies,
  edges,
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

  return (
    <section className="poster-workspace" aria-label="AI 算力系统连接图谱画布">
      <div className="poster-scroll">
        {empty ? (
          <div className="poster-empty">
            <p>没有找到匹配的节点或公司</p>
            <button type="button" onClick={onResetSearch}>
              重置搜索
            </button>
          </div>
        ) : (
          <article className="system-map-sheet">
            <header className="system-map-hero">
              <div>
                <p>从制造输入到算力落地</p>
                <h1>AI 算力系统连接图谱</h1>
                <small>材料进入产品，设备决定制造能力；中间链路说明各模块如何连接成 AI 集群。</small>
              </div>
            </header>

            <section className="system-layer material-layer" aria-label="材料输入层">
              <header className="system-layer-heading">
                <span>01</span>
                <div>
                  <h2>材料输入层</h2>
                  <p>进入产品本身的物料：晶圆/衬底、封装、PCB 与光通信材料。</p>
                </div>
              </header>
              <div className="material-grid">
                {materialLanes.map((lane) => (
                  <section className="input-card" key={lane.title}>
                    <span className="input-target">输入到：{lane.target}</span>
                    <h3>{lane.title}</h3>
                    <p>{lane.summary}</p>
                    <NodeList
                      nodeIds={lane.nodeIds}
                      nodes={nodeById}
                      companies={companyById}
                      selectedNodeId={selectedNodeId}
                      related={related}
                      onSelectNode={onSelectNode}
                    />
                  </section>
                ))}
              </div>
            </section>

            <section className="system-layer main-flow-layer" aria-label="AI 算力主链路">
              <header className="system-layer-heading">
                <span>02</span>
                <div>
                  <h2>AI 算力主链路</h2>
                  <p>从计算芯片、存储、封装、板级互联、光互联，到服务器、交换机和集群。</p>
                </div>
              </header>
              <div className="main-chain">
                {mainChain.map((stage, index) => (
                  <section className="chain-stage" key={stage.title}>
                    <div className="chain-stage-title">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <h3>{stage.title}</h3>
                    </div>
                    <p>{stage.summary}</p>
                    {stage.virtualItems ? (
                      <div className="virtual-node-list">
                        {stage.virtualItems.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                    <NodeList
                      nodeIds={stage.nodeIds}
                      nodes={nodeById}
                      companies={companyById}
                      selectedNodeId={selectedNodeId}
                      related={related}
                      onSelectNode={onSelectNode}
                    />
                    {index < mainChain.length - 1 ? (
                      <span className="chain-arrow" aria-hidden="true">→</span>
                    ) : null}
                  </section>
                ))}
              </div>
            </section>

            <section className="system-layer equipment-layer" aria-label="制造使能层">
              <header className="system-layer-heading">
                <span>03</span>
                <div>
                  <h2>制造使能层</h2>
                  <p>设备通常不进入最终产品，但决定芯片、封装、PCB 和光模块能不能稳定量产。</p>
                </div>
              </header>
              <div className="equipment-grid">
                {equipmentLanes.map((lane) => (
                  <section className="equipment-card" key={lane.title}>
                    <span className="equipment-target">制造能力 ⇢ {lane.target}</span>
                    <h3>{lane.title}</h3>
                    <p>{lane.summary}</p>
                  </section>
                ))}
              </div>
            </section>

            <section className="connection-explainer" aria-label="关键连接说明">
              <header>
                <h2>关键连接说明</h2>
                <p>实线表示物料或模块进入下游产品；虚线表示制造设备提供产能与良率约束。</p>
              </header>
              <div className="connection-grid">
                {keyConnectionLabels.map((label) => (
                  <article className="connection-card" key={label}>
                    <strong>{label}</strong>
                    <small>模块连接</small>
                  </article>
                ))}
                {equipmentLanes.map((lane) => (
                  <article className="connection-card connection-card-dashed" key={`equipment-${lane.title}`}>
                    <strong>{lane.title} ⇢ {lane.target}</strong>
                    <small>制造能力</small>
                  </article>
                ))}
              </div>
            </section>

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

            <footer className="poster-footnote">
              <span>点击真实节点查看技术解释、代表公司和来源证据</span>
              <span>公司池与行情字段后续统一接入，当前先打通产业链连接流程</span>
            </footer>
          </article>
        )}
      </div>
    </section>
  );
}
