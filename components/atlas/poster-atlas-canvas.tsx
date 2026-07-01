import { useEffect, useState } from "react";

import { getNeighborhood } from "@/lib/atlas/graph";
import {
  atlasModules,
  atlasModuleById,
  defaultModuleId,
  moduleConnections,
  type AtlasModule,
  type AtlasModuleId,
  type ModuleConnectionKind,
  type ModuleGroup,
  type ModuleSubnode,
} from "@/lib/atlas/module-map";
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

const moduleConnectionKindLabels: Readonly<Record<ModuleConnectionKind, string>> = {
  flow: "产品 / 物料流",
  enable: "制造使能",
};

const getModuleIdForNode = (nodeId: string): AtlasModuleId | null => {
  for (const module of atlasModules) {
    if (module.representativeNodeIds.includes(nodeId)) return module.id;
    for (const group of module.groups) {
      if (group.nodes.some((subnode) => subnode.realNodeId === nodeId)) {
        return module.id;
      }
    }
  }
  return null;
};

const getModuleRealNodeIds = (module: AtlasModule): ReadonlySet<string> => {
  const nodeIds = new Set(module.representativeNodeIds);
  for (const group of module.groups) {
    for (const subnode of group.nodes) {
      if (subnode.realNodeId) nodeIds.add(subnode.realNodeId);
    }
  }
  return nodeIds;
};

interface PosterAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  selectedNodeId: string | null;
  empty: boolean;
  showSearchResults?: boolean;
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

interface ModuleOverviewProps {
  selectedModuleId: AtlasModuleId;
  onSelectModule: (moduleId: AtlasModuleId) => void;
}

function ModuleOverview({
  selectedModuleId,
  onSelectModule,
}: ModuleOverviewProps) {
  return (
    <section className="module-overview" aria-label="模块总览">
      <header className="module-section-heading">
        <span>01</span>
        <div>
          <h2>模块总览</h2>
          <p>第一层只看大模块和模块之间的输入/输出；点开模块再看内部节点。</p>
        </div>
      </header>
      <div className="module-card-grid">
        {atlasModules.map((module) => (
          <article className="module-card" data-tone={module.tone} key={module.id}>
            <button
              className="module-card-button"
              type="button"
              aria-pressed={module.id === selectedModuleId}
              data-selected={module.id === selectedModuleId}
              onClick={() => onSelectModule(module.id)}
            >
              <span>{String(module.order).padStart(2, "0")}</span>
              <strong>{module.name}</strong>
              <small>{module.role}</small>
            </button>
            <dl className="module-io">
              <div>
                <dt>输入</dt>
                <dd>{module.input}</dd>
              </div>
              <div>
                <dt>输出</dt>
                <dd>{module.output}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleConnections() {
  return (
    <section className="module-connections" aria-label="模块连接">
      <header className="module-section-heading">
        <span>02</span>
        <div>
          <h2>模块连接</h2>
          <p>连接文字由结构化边生成：实线表示物料/产品流，虚线表示制造使能。</p>
        </div>
      </header>
      <div className="module-connection-grid">
        {moduleConnections.map((connection) => (
          <article
            className="module-connection-card"
            data-kind={connection.kind}
            key={connection.id}
          >
            <strong>{connection.label}</strong>
            <span>{moduleConnectionKindLabels[connection.kind]}</span>
            <p>{connection.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

interface VirtualSubnodeProps {
  subnode: ModuleSubnode;
}

function VirtualSubnode({ subnode }: VirtualSubnodeProps) {
  return (
    <span className="module-subnode" title={subnode.description}>
      <strong>{subnode.label}</strong>
      <small>{subnode.realNodeId ? "已有真实节点" : "待接公司数据"}</small>
    </span>
  );
}

interface ModuleGroupCardProps {
  group: ModuleGroup;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function ModuleGroupCard({
  group,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: ModuleGroupCardProps) {
  const realNodeIds = group.nodes.flatMap(({ realNodeId }) =>
    realNodeId && nodes.has(realNodeId) ? [realNodeId] : [],
  );

  return (
    <section className="module-group-card">
      <header>
        <h3>{group.title}</h3>
        <p>{group.summary}</p>
      </header>
      <div className="module-subnode-grid">
        {group.nodes.map((subnode) => (
          <VirtualSubnode key={subnode.id} subnode={subnode} />
        ))}
      </div>
      <NodeList
        nodeIds={realNodeIds}
        nodes={nodes}
        companies={companies}
        selectedNodeId={selectedNodeId}
        related={related}
        onSelectNode={onSelectNode}
      />
    </section>
  );
}

interface ExpandedModuleProps {
  module: AtlasModule;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function ExpandedModule({
  module,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: ExpandedModuleProps) {
  return (
    <section className="expanded-module" data-tone={module.tone} aria-label={`${module.name}内部节点`}>
      <header className="expanded-module-header">
        <div>
          <span>03 · 已展开模块</span>
          <h2>{module.name}</h2>
          <p>{module.summary}</p>
        </div>
        <dl>
          <div>
            <dt>输入</dt>
            <dd>{module.input}</dd>
          </div>
          <div>
            <dt>输出</dt>
            <dd>{module.output}</dd>
          </div>
        </dl>
      </header>

      <div className="expanded-module-body">
        <div className="module-group-grid">
          {module.groups.map((group) => (
            <ModuleGroupCard
              key={group.id}
              group={group}
              nodes={nodes}
              companies={companies}
              selectedNodeId={selectedNodeId}
              related={related}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
        <aside className="internal-connection-panel" aria-label={`${module.name}内部连接`}>
          <h3>内部连接</h3>
          <div className="internal-connection-list">
            {module.internalConnections.map((connection) => (
              <article
                className="internal-connection"
                data-kind={connection.kind}
                key={connection.id}
              >
                <strong>{connection.label}</strong>
                <small>{moduleConnectionKindLabels[connection.kind]}</small>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

interface SearchResultsProps {
  nodes: readonly AtlasNode[];
  companies: ReadonlyMap<string, AtlasCompany>;
  excludeNodeIds: ReadonlySet<string>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

function SearchResults({
  nodes,
  companies,
  excludeNodeIds,
  selectedNodeId,
  related,
  onSelectNode,
}: SearchResultsProps) {
  const orderedIds = nodes
    .map(({ id }) => id)
    .filter((nodeId) => !excludeNodeIds.has(nodeId));

  if (orderedIds.length === 0) return null;

  return (
    <section className="search-result-strip" aria-label="搜索匹配节点">
      <header>
        <h2>搜索匹配节点</h2>
        <p>搜索结果会临时显示可点击真实节点；材料细分 chip 仍留在模块内部。</p>
      </header>
      <NodeList
        nodeIds={orderedIds}
        nodes={new Map(nodes.map((node) => [node.id, node]))}
        companies={companies}
        selectedNodeId={selectedNodeId}
        related={related}
        onSelectNode={onSelectNode}
      />
    </section>
  );
}

export function PosterAtlasCanvas({
  nodes,
  companies,
  edges,
  selectedNodeId,
  empty,
  showSearchResults = false,
  onSelectNode,
  onResetSearch,
}: PosterAtlasCanvasProps) {
  const [selectedModuleId, setSelectedModuleId] =
    useState<AtlasModuleId>(defaultModuleId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const companyById = new Map(companies.map((company) => [company.id, company]));
  const nodeIdSet = new Set(nodes.map(({ id }) => id));
  const visibleEdges = edges.filter(
    ({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to),
  );
  const related = selectedNodeId
    ? getNeighborhood(selectedNodeId, visibleEdges)
    : null;
  const selectedNodeModuleId = selectedNodeId
    ? getModuleIdForNode(selectedNodeId)
    : null;
  const activeModuleId = selectedNodeModuleId ?? selectedModuleId;
  const selectedModule =
    atlasModuleById.get(activeModuleId) ?? atlasModuleById.get(defaultModuleId);
  const activeModuleNodeIds = selectedModule
    ? getModuleRealNodeIds(selectedModule)
    : new Set<string>();

  useEffect(() => {
    if (!selectedNodeModuleId || selectedNodeModuleId === selectedModuleId) return;
    setSelectedModuleId(selectedNodeModuleId);
  }, [selectedModuleId, selectedNodeModuleId]);

  return (
    <section className="poster-workspace" aria-label="AI 算力模块化地图画布">
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
                <p>从模块总览到内部节点</p>
                <h1>AI 算力模块化地图</h1>
                <small>
                  先看材料、设备、芯片、封装、PCB、光互联、算力落地七个模块；再展开模块查看最小节点和连接。
                </small>
              </div>
            </header>

            <ModuleOverview
              selectedModuleId={activeModuleId}
              onSelectModule={setSelectedModuleId}
            />

            <ModuleConnections />

            {showSearchResults ? (
              <SearchResults
                nodes={nodes}
                companies={companyById}
                excludeNodeIds={activeModuleNodeIds}
                selectedNodeId={selectedNodeId}
                related={related}
                onSelectNode={onSelectNode}
              />
            ) : null}

            {selectedModule ? (
              <ExpandedModule
                module={selectedModule}
                nodes={nodeById}
                companies={companyById}
                selectedNodeId={selectedNodeId}
                related={related}
                onSelectNode={onSelectNode}
              />
            ) : null}

            <div className="visually-hidden" aria-label="可见产业关系">
              <h2>可见产业关系</h2>
              <ul>
                {visibleEdges.map((edge) => (
                  <li key={`summary-${edge.id}`}>
                    {nodeById.get(edge.from)?.name ?? edge.from} →{" "}
                    {nodeById.get(edge.to)?.name ?? edge.to}（
                    {relationshipTypeLabels[edge.type]}）
                  </li>
                ))}
              </ul>
            </div>

            <footer className="poster-footnote">
              <span>模块连接来自结构化边，不再靠散乱说明文字硬凑</span>
              <span>细分材料节点先作为解释层，后续接公司和行情数据时再升级为真实节点</span>
            </footer>
          </article>
        )}
      </div>
    </section>
  );
}
