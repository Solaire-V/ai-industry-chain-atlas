import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { StageNodeButton } from "@/components/atlas/stage-node-button";
import { getNeighborhood } from "@/lib/atlas/graph";
import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasMarketSnapshot,
  AtlasNode,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";
import type { AtlasWorkspaceView } from "@/lib/atlas/query-state";
import {
  atlasStageById,
  atlasStages,
  defaultStageId,
  findStageBySearch,
  getStageIdForNode,
  mainChainConnections,
  type AtlasStage,
  type AtlasStageId,
  type MainChainConnection,
  type StageConnectionKind,
  type StageGroup,
  type StageSubnode,
  type StageSubnodeKind,
} from "@/lib/atlas/stage-map";

interface ThreeLayerAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  activeView: AtlasWorkspaceView;
  selectedStageId: AtlasStageId;
  selectedNodeId: string | null;
  search: string;
  empty: boolean;
  onChangeView: (view: AtlasWorkspaceView) => void;
  onSelectStage: (stageId: AtlasStageId) => void;
  onOpenStageInCanvas: (stageId: AtlasStageId) => void;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

type WorkspaceView = AtlasWorkspaceView;

type SwimlaneId = "upstream" | "midstream" | "downstream" | "support";

const SWIMLANE_MAP_WIDTH = 1040;
const SWIMLANE_MAP_HEIGHT = 650;
const SWIMLANE_MAP_MIN_SCALE = 0.32;

interface SwimlaneNode {
  stageId: AtlasStageId | "software-ip";
  title: string;
  subtitle: string;
  lane: SwimlaneId;
  x: number;
  y: number;
  virtual?: boolean;
}

interface SwimlaneConnection {
  id: string;
  from: SwimlaneNode["stageId"];
  to: SwimlaneNode["stageId"];
  kind: StageConnectionKind;
  path: string;
  label: string;
  summary: string;
}

const workspaceViews: readonly {
  id: WorkspaceView;
  title: string;
  description: string;
}[] = [
  { id: "canvas", title: "主界面", description: "产业链全景画布" },
  { id: "nodes", title: "节点库", description: "细分节点" },
  { id: "companies", title: "公司库", description: "公司与业务" },
  { id: "markets", title: "行情数据", description: "股价 / PE / 市值" },
  { id: "supply", title: "供需关系", description: "供应与客户" },
  { id: "settings", title: "数据设置", description: "数据源配置" },
];

const laneLabels: Readonly<Record<SwimlaneId, string>> = {
  upstream: "上游输入",
  midstream: "中游制造 / 集成",
  downstream: "下游应用",
  support: "支撑能力",
};

const stageLaneLabels: Readonly<Record<AtlasStageId, string>> = {
  materials: "上游输入",
  equipment: "支撑能力",
  "ai-chip": "中游制造 / 集成",
  "hbm-memory": "中游制造 / 集成",
  "advanced-packaging": "中游制造 / 集成",
  "board-system": "中游制造 / 集成",
  "optical-interconnect": "中游制造 / 集成",
  "server-network": "中游制造 / 集成",
  "compute-applications": "下游应用",
};

const swimlaneNodes: readonly SwimlaneNode[] = [
  {
    stageId: "materials",
    title: "材料",
    subtitle: "硅片 / 光材料 / 封装材料",
    lane: "upstream",
    x: 138,
    y: 110,
  },
  {
    stageId: "equipment",
    title: "半导体设备",
    subtitle: "制造 / 封装 / 测试设备",
    lane: "support",
    x: 250,
    y: 506,
  },
  {
    stageId: "ai-chip",
    title: "AI 芯片",
    subtitle: "GPU / ASIC / 加速器",
    lane: "midstream",
    x: 168,
    y: 292,
  },
  {
    stageId: "hbm-memory",
    title: "HBM",
    subtitle: "高带宽存储",
    lane: "midstream",
    x: 315,
    y: 292,
  },
  {
    stageId: "advanced-packaging",
    title: "先进封装",
    subtitle: "2.5D / 3D / CoWoS",
    lane: "midstream",
    x: 462,
    y: 292,
  },
  {
    stageId: "board-system",
    title: "PCB / 板级系统",
    subtitle: "主板 / 加速卡 / 电源",
    lane: "midstream",
    x: 610,
    y: 292,
  },
  {
    stageId: "optical-interconnect",
    title: "光互联",
    subtitle: "CPO / OCS / 光模块",
    lane: "midstream",
    x: 762,
    y: 292,
  },
  {
    stageId: "server-network",
    title: "服务器集群",
    subtitle: "AI 服务器 / 交换机",
    lane: "midstream",
    x: 902,
    y: 292,
  },
  {
    stageId: "compute-applications",
    title: "AI 应用",
    subtitle: "云 / 模型 / 行业场景",
    lane: "downstream",
    x: 902,
    y: 442,
  },
  {
    stageId: "software-ip",
    title: "软件 / IP 工具链",
    subtitle: "EDA / IP / 驱动 / 管理",
    lane: "support",
    x: 520,
    y: 506,
    virtual: true,
  },
];

const mainChainConnectionPaths: Readonly<Record<MainChainConnection["id"], string>> = {
  "materials-to-ai-chip": "M 138 158 C 138 208 168 214 168 248",
  "materials-to-hbm": "M 190 144 C 265 178 315 205 315 248",
  "materials-to-packaging": "M 208 122 C 330 122 462 190 462 248",
  "materials-to-board": "M 208 134 C 372 162 610 192 610 248",
  "materials-to-optical": "M 208 98 C 430 82 730 102 762 248",
  "equipment-to-ai-chip": "M 250 462 C 250 410 168 394 168 336",
  "equipment-to-hbm": "M 250 462 C 282 418 315 390 315 336",
  "equipment-to-packaging": "M 304 506 C 408 490 462 390 462 336",
  "equipment-to-board": "M 304 506 C 510 484 610 390 610 336",
  "equipment-to-optical": "M 304 506 C 640 490 762 398 762 336",
  "ai-chip-to-packaging": "M 222 292 C 285 292 390 292 408 292",
  "hbm-to-packaging": "M 369 292 C 388 292 392 292 408 292",
  "packaging-to-board": "M 516 292 C 535 292 555 292 556 292",
  "board-to-server": "M 664 292 C 728 292 812 292 848 292",
  "optical-to-server": "M 816 292 C 828 292 835 292 848 292",
  "server-to-apps": "M 902 336 C 902 372 902 382 902 398",
};

const virtualSwimlaneConnections: readonly SwimlaneConnection[] = [
  {
    id: "software-to-chip",
    from: "software-ip",
    to: "ai-chip",
    kind: "enable",
    label: "软件 / IP 工具链 ⇢ AI 芯片",
    summary: "EDA、IP、编译器和驱动支撑芯片设计、验证与落地。",
    path: "M 520 462 C 410 420 250 390 168 336",
  },
  {
    id: "software-to-server",
    from: "software-ip",
    to: "server-network",
    kind: "enable",
    label: "软件 / IP 工具链 ⇢ 服务器网络",
    summary: "驱动、调度、网络管理和集群软件把硬件组织成可用算力。",
    path: "M 574 506 C 760 492 902 392 902 336",
  },
];

function getMainChainConnectionPath(connection: MainChainConnection) {
  const path = mainChainConnectionPaths[connection.id];
  if (!path) {
    throw new Error(`Missing swimlane path for main chain connection: ${connection.id}`);
  }
  return path;
}

const swimlaneConnections: readonly SwimlaneConnection[] = [
  ...mainChainConnections.map((connection) => ({
    ...connection,
    path: getMainChainConnectionPath(connection),
  })),
  ...virtualSwimlaneConnections,
];

const relationshipTypeLabels: Readonly<
  Record<AtlasIndustryEdge["type"], string>
> = {
  supply: "供给",
  integrate: "集成",
  deploy: "部署",
};

const stageConnectionKindLabels: Readonly<Record<StageConnectionKind, string>> = {
  flow: "产品 / 物料流",
  enable: "制造使能",
};

const stageSubnodeKindLabels: Readonly<Record<StageSubnodeKind, string>> = {
  material: "材料",
  equipment: "设备",
  component: "组件",
  system: "系统",
  software: "软件",
  application: "应用",
};

const isStageId = (id: SwimlaneNode["stageId"]): id is AtlasStageId =>
  id !== "software-ip";

const getSwimlaneNodeTitle = (id: SwimlaneNode["stageId"]) => {
  if (isStageId(id)) return atlasStageById.get(id)?.name ?? id;
  return swimlaneNodes.find((node) => node.stageId === id)?.title ?? id;
};

function getInspectorConnectionGroups(
  stageId: AtlasStageId,
  connections: readonly SwimlaneConnection[],
) {
  return [
    {
      id: "incoming",
      title: "上游输入",
      helper: "物料 / 产品流入当前模块",
      items: connections.filter(
        (connection) => connection.kind === "flow" && connection.to === stageId,
      ),
    },
    {
      id: "incoming-enable",
      title: "外部使能",
      helper: "设备、软件或工具链支撑当前模块",
      items: connections.filter(
        (connection) => connection.kind === "enable" && connection.to === stageId,
      ),
    },
    {
      id: "outgoing",
      title: "下游输出",
      helper: "当前模块继续流向下游",
      items: connections.filter(
        (connection) => connection.kind === "flow" && connection.from === stageId,
      ),
    },
    {
      id: "outgoing-enable",
      title: "支撑下游",
      helper: "当前模块作为使能能力支撑其他环节",
      items: connections.filter(
        (connection) => connection.kind === "enable" && connection.from === stageId,
      ),
    },
  ].filter(({ items }) => items.length > 0);
}

function isConnectionActive(
  connection: SwimlaneConnection,
  activeStageId: AtlasStageId,
) {
  return connection.from === activeStageId || connection.to === activeStageId;
}

function CanvasNavigation({
  activeView,
  onChangeView,
}: {
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
}) {
  return (
    <nav className="atlas-product-nav" aria-label="AI 产业链目录">
      <div className="atlas-product-nav-title">
        <strong>AI产业链图谱</strong>
        <small>v1.0.0</small>
      </div>
      <div className="atlas-product-nav-items">
        {workspaceViews.map((view, index) => (
          <button
            key={view.id}
            type="button"
            aria-current={view.id === activeView ? "page" : undefined}
            onClick={() => onChangeView(view.id)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{view.title}</strong>
            <small>{view.description}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SwimlaneStageButton({
  node,
  activeStageId,
  onSelectStage,
}: {
  node: SwimlaneNode;
  activeStageId: AtlasStageId;
  onSelectStage: (stageId: AtlasStageId) => void;
}) {
  const active = node.stageId === activeStageId;
  const related =
    node.stageId === activeStageId ||
    swimlaneConnections.some(
      (connection) =>
        isConnectionActive(connection, activeStageId) &&
        (connection.from === node.stageId || connection.to === node.stageId),
    );
  const stage = isStageId(node.stageId) ? atlasStageById.get(node.stageId) : null;

  if (!stage) {
    return (
      <div
        className="swimlane-stage swimlane-stage-virtual"
        data-lane={node.lane}
        style={
          {
            "--stage-x": `${node.x}px`,
            "--stage-y": `${node.y}px`,
          } as CSSProperties
        }
      >
        <span className="swimlane-stage-code">IP</span>
        <strong>{node.title}</strong>
        <small>{node.subtitle}</small>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="swimlane-stage"
      aria-label={stage.name}
      aria-pressed={active}
      data-stage-id={stage.id}
      data-lane={node.lane}
      data-active={active}
      data-related={related}
      onClick={() => onSelectStage(stage.id)}
      style={
        {
          "--stage-x": `${node.x}px`,
          "--stage-y": `${node.y}px`,
        } as CSSProperties
      }
    >
      <span className="swimlane-stage-code">
        {String(stage.order).padStart(2, "0")}
      </span>
      <strong>{node.title}</strong>
      <small>{node.subtitle}</small>
    </button>
  );
}

function SwimlaneCanvas({
  activeStageId,
  onSelectStage,
}: {
  activeStageId: AtlasStageId;
  onSelectStage: (stageId: AtlasStageId) => void;
}) {
  const canvasRef = useRef<HTMLElement | null>(null);
  const mapScrollRef = useRef<HTMLDivElement | null>(null);
  const [mapScale, setMapScale] = useState(1);
  const activeStage = atlasStageById.get(activeStageId);

  useEffect(() => {
    const mapContainer = mapScrollRef.current;
    if (!mapContainer) return;

    const updateMapScale = () => {
      const availableWidth = mapContainer.clientWidth;
      if (!availableWidth) {
        setMapScale(1);
        return;
      }

      setMapScale(
        Math.min(
          1,
          Math.max(
            SWIMLANE_MAP_MIN_SCALE,
            (availableWidth - 8) / SWIMLANE_MAP_WIDTH,
          ),
        ),
      );
    };

    updateMapScale();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateMapScale);
      return () => window.removeEventListener("resize", updateMapScale);
    }

    const resizeObserver = new ResizeObserver(updateMapScale);
    resizeObserver.observe(mapContainer);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (mapScale < 0.98) return;
    const selectedStage = canvasRef.current?.querySelector<HTMLElement>(
      `[data-stage-id="${activeStageId}"]`,
    );
    if (typeof selectedStage?.scrollIntoView !== "function") return;
    selectedStage.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeStageId, mapScale]);

  return (
    <section
      ref={canvasRef}
      className="swimlane-canvas-card"
      aria-label="产业链泳道画布"
    >
      <header className="swimlane-toolbar">
        <div>
          <h1>AI 产业链泳道图</h1>
          <p>第一屏只看流程：材料与设备如何进入制造集成，最后落到服务器和应用。</p>
          <div className="swimlane-focus-pill" aria-live="polite">
            当前：{activeStage?.name ?? "主流程"}
            <span>点击模块查看输入 / 核心流程 / 输出</span>
          </div>
        </div>
        <div className="swimlane-legend" aria-label="连接类型">
          <span><i data-kind="flow" />物料/产品流</span>
          <span><i data-kind="enable" />设备/软件使能</span>
        </div>
      </header>

      <div
        ref={mapScrollRef}
        className="swimlane-map-scroll"
        style={
          {
            "--map-scale": mapScale,
            "--map-width": `${SWIMLANE_MAP_WIDTH}px`,
            "--map-height": `${SWIMLANE_MAP_HEIGHT}px`,
          } as CSSProperties
        }
      >
        <div className="swimlane-map-frame">
          <div className="swimlane-map">
          <div className="swimlane-label swimlane-label-upstream">
            {laneLabels.upstream}
          </div>
          <div className="swimlane-label swimlane-label-midstream">
            {laneLabels.midstream}
          </div>
          <div className="swimlane-label swimlane-label-downstream">
            {laneLabels.downstream}
          </div>
          <div className="swimlane-label swimlane-label-support">
            {laneLabels.support}
          </div>

          <svg
            className="swimlane-connectors"
            viewBox="0 0 1000 620"
            role="img"
            aria-label="产业链模块连接关系"
          >
            <defs>
              <marker
                id="atlas-flow-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
              <marker
                id="atlas-enable-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M0,0 L8,4 L0,8 Z" />
              </marker>
            </defs>
            {swimlaneConnections.map((connection) => (
              <path
                key={connection.id}
                d={connection.path}
                data-kind={connection.kind}
                data-active={isConnectionActive(connection, activeStageId)}
                aria-label={connection.label}
                markerEnd={`url(#atlas-${connection.kind}-arrow)`}
              />
            ))}
          </svg>

          {swimlaneNodes.map((node) => (
            <SwimlaneStageButton
              key={node.stageId}
              node={node}
              activeStageId={activeStageId}
              onSelectStage={onSelectStage}
            />
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StageInspector({
  stage,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: {
  stage: AtlasStage;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const stageChainConnections = swimlaneConnections.filter(
    (connection) => connection.from === stage.id || connection.to === stage.id,
  );
  const stageConnectionGroups = getInspectorConnectionGroups(
    stage.id,
    stageChainConnections,
  );
  const realNodes = [
    ...stage.diagram.inputs,
    ...stage.diagram.core,
    ...stage.diagram.outputs,
  ]
    .map(({ realNodeId }) => (realNodeId ? nodes.get(realNodeId) : undefined))
    .filter((node): node is AtlasNode => Boolean(node));

  return (
    <aside
      className="stage-inspector"
      aria-label={`${stage.name}流程详情`}
      data-tone={stage.tone}
    >
      <div className="stage-inspector-hero">
        <span className="stage-inspector-order">
          {String(stage.order).padStart(2, "0")}
        </span>
        <div>
          <small>{stageLaneLabels[stage.id]}</small>
          <h2>{stage.name}</h2>
          <p>{stage.role}</p>
        </div>
      </div>

      <section className="stage-inspector-metrics" aria-label="模块信息摘要">
        <div>
          <span>连接</span>
          <strong>{stageChainConnections.length}</strong>
          <small>条主链关系</small>
        </div>
        <div>
          <span>流程</span>
          <strong>{stage.internalConnections.length}</strong>
          <small>步内部链路</small>
        </div>
        <div>
          <span>深入</span>
          <strong>{realNodes.length}</strong>
          <small>个可点节点</small>
        </div>
      </section>

      <section className="stage-inspector-section">
        <div className="stage-inspector-section-heading">
          <div>
            <h3>连接总览</h3>
            <small>与画布高亮一致，按关系类型分组</small>
          </div>
        </div>
        <div className="stage-inspector-connection-groups">
          {stageConnectionGroups.map((group) => (
            <article key={group.id} className="stage-inspector-connection-group">
              <header>
                <strong>{group.title}</strong>
                <small>{group.helper}</small>
              </header>
              <ol className="stage-inspector-chain-list">
                {group.items.map((connection) => {
                  const isOutgoing = connection.from === stage.id;
                  const connectedStageId = isOutgoing ? connection.to : connection.from;
                  const connectedStageTitle = getSwimlaneNodeTitle(connectedStageId);
                  return (
                    <li key={connection.id} data-kind={connection.kind}>
                      <strong>{connection.label}</strong>
                      <small>
                        <span>
                          {isOutgoing ? "流向" : "来自"}：{connectedStageTitle}
                        </span>
                        <span>{connection.summary}</span>
                      </small>
                    </li>
                  );
                })}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="stage-inspector-section">
        <div className="stage-inspector-section-heading">
          <div>
            <h3>内部主流程</h3>
            <small>{stage.diagram.summary}</small>
          </div>
        </div>
        <ol className="stage-inspector-steps">
          {stage.internalConnections.map((connection, index) => (
            <li key={connection.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{connection.label}</strong>
                <small>{stageConnectionKindLabels[connection.kind]}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="stage-inspector-section">
        <div className="stage-inspector-section-heading">
          <div>
            <h3>输入 / 输出</h3>
            <small>保留全量节点，用 chips 扫读</small>
          </div>
        </div>
        <div className="stage-inspector-io-grid">
          <div>
            <h4>输入</h4>
            <ul className="stage-inspector-chip-list">
              {stage.diagram.inputs.map((node) => (
                <li key={node.id}>{node.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>输出</h4>
            <ul className="stage-inspector-chip-list">
              {stage.diagram.outputs.map((node) => (
                <li key={node.id}>{node.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {realNodes.length ? (
        <section className="stage-inspector-section">
          <div className="stage-inspector-section-heading">
            <div>
              <h3>继续查看</h3>
              <small>点击进入细分节点、公司与证据</small>
            </div>
          </div>
          <div className="stage-inspector-node-list">
            {realNodes.map((node) => (
              <StageNodeButton
                key={node.id}
                node={node}
                companies={companies}
                selectedNodeId={selectedNodeId}
                related={related}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}

interface NodeLibraryItem {
  key: string;
  stage: AtlasStage;
  group: StageGroup;
  node: StageSubnode;
  realNode?: AtlasNode;
}

const getSubnodeCoverageKey = (
  stageId: AtlasStageId,
  groupId: string,
  subnodeId: string,
) => `${stageId}\u0000${groupId}\u0000${subnodeId}`;

interface RealNodeStageAppearance {
  stageId: AtlasStageId;
  stageName: string;
  groupTitle: string;
  nodeLabel: string;
}

function getRealNodeStageAppearancesById() {
  const appearances = new Map<string, RealNodeStageAppearance[]>();

  for (const stage of atlasStages) {
    for (const group of stage.groups) {
      for (const node of group.nodes) {
        if (!node.realNodeId) continue;
        const existing = appearances.get(node.realNodeId) ?? [];
        existing.push({
          stageId: stage.id,
          stageName: stage.name,
          groupTitle: group.title,
          nodeLabel: node.label,
        });
        appearances.set(node.realNodeId, existing);
      }
    }
  }

  return appearances;
}

function isCrossStageRealNode(appearances: readonly RealNodeStageAppearance[]) {
  return new Set(appearances.map(({ stageId }) => stageId)).size > 1;
}

function getNodeLibraryItems(
  stage: AtlasStage,
  nodeById: ReadonlyMap<string, AtlasNode>,
): readonly NodeLibraryItem[] {
  return stage.groups.flatMap((group) =>
    group.nodes.map((node) => ({
      key: `${stage.id}:${group.id}:${node.id}`,
      stage,
      group,
      node,
      realNode: node.realNodeId ? nodeById.get(node.realNodeId) : undefined,
    })),
  );
}

function NodeLibraryPanel({
  nodes,
  companies,
  subnodeCompanyCoverages,
  selectedStageId,
  selectedNodeId,
  onSelectStage,
  onOpenStageInCanvas,
  onSelectNode,
}: {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  selectedStageId: AtlasStageId;
  selectedNodeId: string | null;
  onSelectStage: (stageId: AtlasStageId) => void;
  onOpenStageInCanvas: (stageId: AtlasStageId) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const coveragesBySubnode = useMemo(() => {
    const index = new Map<string, SubnodeCompanyCoverage[]>();
    for (const coverage of subnodeCompanyCoverages) {
      const key = getSubnodeCoverageKey(
        coverage.stageId as AtlasStageId,
        coverage.groupId,
        coverage.subnodeId,
      );
      index.set(key, [...(index.get(key) ?? []), coverage]);
    }
    for (const coverages of index.values()) {
      coverages.sort((left, right) => left.rank - right.rank);
    }
    return index;
  }, [subnodeCompanyCoverages]);
  const realNodeAppearancesById = useMemo(
    () => getRealNodeStageAppearancesById(),
    [],
  );
  const selectedStage =
    atlasStageById.get(selectedStageId) ?? atlasStages[0]!;
  const stageItems = useMemo(
    () => getNodeLibraryItems(selectedStage, nodeById),
    [nodeById, selectedStage],
  );
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

  useEffect(() => {
    const selectedRealNodeItem = selectedNodeId
      ? stageItems.find((item) => item.realNode?.id === selectedNodeId)
      : undefined;
    const fallbackItem = stageItems[0];
    const keyStillVisible = stageItems.some((item) => item.key === selectedItemKey);

    if (selectedRealNodeItem && selectedRealNodeItem.key !== selectedItemKey) {
      setSelectedItemKey(selectedRealNodeItem.key);
      return;
    }
    if (!keyStillVisible) {
      setSelectedItemKey(fallbackItem?.key ?? null);
    }
  }, [selectedItemKey, selectedNodeId, stageItems]);

  const selectedItem =
    stageItems.find((item) => item.key === selectedItemKey) ?? stageItems[0];
  const selectedRealNode = selectedItem?.realNode;
  const selectedRealNodeAppearances = selectedRealNode
    ? realNodeAppearancesById.get(selectedRealNode.id) ?? []
    : [];
  const selectedIsCrossStage = isCrossStageRealNode(selectedRealNodeAppearances);
  const selectedCompanies = selectedRealNode
    ? selectedRealNode.companyIds
        .map((companyId) => companyById.get(companyId))
        .filter((company): company is AtlasCompany => Boolean(company))
    : [];
  const selectedCoverages = selectedItem
    ? coveragesBySubnode.get(
        getSubnodeCoverageKey(
          selectedItem.stage.id,
          selectedItem.group.id,
          selectedItem.node.id,
        ),
      ) ?? []
    : [];
  const selectedStageStats = {
    groupCount: selectedStage.groups.length,
    nodeCount: stageItems.length,
    mappedCount: stageItems.filter((item) => item.realNode).length,
    pendingCount: stageItems.filter((item) => !item.realNode).length,
  };

  return (
    <section className="workspace-data-panel node-library-panel" aria-label="节点库">
      <header className="node-library-header">
        <div>
          <h1>节点库</h1>
          <p>
            细分节点索引与主界面 9 个模块共用同一份 stageId / nodeId；
            概念节点用于理解流程，可投资节点可继续打开公司与证据详情。
          </p>
        </div>
        <div className="node-library-summary" aria-label="节点库统计">
          <span>
            <strong>{atlasStages.length}</strong>
            主链模块
          </span>
          <span>
            <strong>
              {atlasStages.reduce(
                (total, stage) =>
                  total +
                  stage.groups.reduce((count, group) => count + group.nodes.length, 0),
                0,
              )}
            </strong>
            细分节点
          </span>
          <span>
            <strong>
              {atlasStages.reduce(
                (total, stage) =>
                  total +
                  getNodeLibraryItems(stage, nodeById).filter((item) => item.realNode)
                    .length,
                0,
              )}
            </strong>
            已绑定投资节点
          </span>
        </div>
      </header>

      <div className="node-library-layout">
        <aside className="node-library-stage-nav" aria-label="节点库阶段导航">
          {atlasStages.map((stage) => {
            const items = getNodeLibraryItems(stage, nodeById);
            const mappedCount = items.filter((item) => item.realNode).length;
            return (
              <button
                key={stage.id}
                type="button"
                aria-pressed={stage.id === selectedStage.id}
                data-active={stage.id === selectedStage.id}
                onClick={() => onSelectStage(stage.id)}
              >
                <span>{String(stage.order).padStart(2, "0")}</span>
                <strong>{stage.name}</strong>
                <small>
                  {items.length} 个节点 ·{" "}
                  {mappedCount > 0 ? `${mappedCount} 个可投资` : "待补投资节点"}
                </small>
              </button>
            );
          })}
        </aside>

        <main className="node-library-browser" aria-label={`${selectedStage.name}细分节点`}>
          <section className="node-library-stage-overview">
            <div>
              <small>{stageLaneLabels[selectedStage.id]}</small>
              <h2>{selectedStage.name}</h2>
              <p>{selectedStage.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenStageInCanvas(selectedStage.id)}
            >
              定位主界面模块
            </button>
          </section>

          <div className="node-library-stage-metrics" aria-label="当前阶段节点统计">
            <span>
              <strong>{selectedStageStats.groupCount}</strong>
              二级分类
            </span>
            <span>
              <strong>{selectedStageStats.nodeCount}</strong>
              细分节点
            </span>
            <span>
              <strong>{selectedStageStats.mappedCount}</strong>
              已绑定投资节点
            </span>
            <span>
              <strong>{selectedStageStats.pendingCount}</strong>
              待补节点
            </span>
          </div>

          <div className="node-library-groups">
            {selectedStage.groups.map((group) => (
              <article key={group.id} className="node-library-group">
                <header>
                  <h3>{group.title}</h3>
                  <p>{group.summary}</p>
                </header>
                <div className="node-library-node-grid">
                  {group.nodes.map((node) => {
                    const key = `${selectedStage.id}:${group.id}:${node.id}`;
                    const realNode = node.realNodeId
                      ? nodeById.get(node.realNodeId)
                      : undefined;
                    const appearances = realNode
                      ? realNodeAppearancesById.get(realNode.id) ?? []
                      : [];
                    const crossStage = isCrossStageRealNode(appearances);
                    const coverages =
                      coveragesBySubnode.get(
                        getSubnodeCoverageKey(selectedStage.id, group.id, node.id),
                      ) ?? [];
                    const topCoverageCompany = coverages[0]
                      ? companyById.get(coverages[0].companyId)
                      : undefined;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selectedItem?.key === key}
                        data-selected={selectedItem?.key === key}
                        data-mapped={Boolean(realNode)}
                        data-cross-stage={crossStage}
                        data-testid={`library-node-${node.id}`}
                        onClick={() => setSelectedItemKey(key)}
                      >
                        <span>{stageSubnodeKindLabels[node.kind]}</span>
                        <strong>{node.label}</strong>
                        <small>
                          {coverages.length
                            ? `${coverages.length} 家覆盖`
                            : realNode
                              ? "可投资节点"
                              : "概念节点"}
                        </small>
                        {topCoverageCompany ? (
                          <em className="node-library-node-badge node-library-node-badge-company">
                            {topCoverageCompany.name}
                          </em>
                        ) : null}
                        {crossStage ? (
                          <em className="node-library-node-badge">跨阶段</em>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="node-library-detail" aria-label="节点详情">
          {selectedItem ? (
            <>
              <header>
                <span>{stageSubnodeKindLabels[selectedItem.node.kind]}</span>
                <h2>{selectedItem.node.label}</h2>
                <small>
                  {selectedRealNode ? "可投资节点" : "概念节点"} · 对齐主界面：
                  {selectedItem.stage.name}
                </small>
              </header>
              <section>
                <h3>节点说明</h3>
                <p>{selectedItem.node.description}</p>
              </section>
              <section>
                <h3>主界面对齐</h3>
                <dl className="node-library-definition-list">
                  <div>
                    <dt>主链模块</dt>
                    <dd>
                      {String(selectedItem.stage.order).padStart(2, "0")} ·{" "}
                      {selectedItem.stage.name}
                    </dd>
                  </div>
                  <div>
                    <dt>二级分类</dt>
                    <dd>{selectedItem.group.title}</dd>
                  </div>
                  <div>
                    <dt>输入</dt>
                    <dd>{selectedItem.stage.input}</dd>
                  </div>
                  <div>
                    <dt>输出</dt>
                    <dd>{selectedItem.stage.output}</dd>
                  </div>
                </dl>
              </section>
              {selectedIsCrossStage ? (
                <section>
                  <h3>跨阶段复用</h3>
                  <p>
                    同一个真实节点在多个主链模块承担不同角色，属于复用关系，不是重复数据。
                  </p>
                  <ul className="node-library-reuse-list">
                    {selectedRealNodeAppearances.map((appearance) => (
                      <li
                        key={`${appearance.stageId}:${appearance.groupTitle}:${appearance.nodeLabel}`}
                      >
                        <strong>
                          {appearance.stageName} / {appearance.groupTitle}
                        </strong>
                        <small>{appearance.nodeLabel}</small>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {selectedCoverages.length ? (
                <section>
                  <h3>子节点覆盖公司</h3>
                  <div className="node-library-coverage-list">
                    {selectedCoverages.map((coverage) => {
                      const company = companyById.get(coverage.companyId);
                      return (
                        <article key={coverage.id}>
                          <header>
                            <strong>{company?.name ?? coverage.companyId}</strong>
                            <small>
                              {company
                                ? `${company.ticker} · ${company.exchange} · ${company.market}`
                                : coverage.companyId}
                            </small>
                          </header>
                          <div className="node-library-coverage-tags">
                            <span>#{coverage.rank}</span>
                            <span>{coverage.priority}</span>
                            <span>{coverage.relevance}</span>
                            <span>{coverage.evidenceLevel} 级证据</span>
                          </div>
                          <p>{coverage.role}</p>
                          {coverage.marketShareNote ? (
                            <small>{coverage.marketShareNote}</small>
                          ) : null}
                          {coverage.marketCapNote ? (
                            <small>{coverage.marketCapNote}</small>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {selectedRealNode ? (
                <>
                  <section>
                    <h3>投资节点资料</h3>
                    <p>{selectedRealNode.summary}</p>
                    <small>{selectedRealNode.technology}</small>
                  </section>
                  <section>
                    <h3>代表公司</h3>
                    <div className="node-library-company-list">
                      {selectedCompanies.map((company) => (
                        <span key={company.id}>
                          {company.name}
                          <small>{company.ticker}</small>
                        </span>
                      ))}
                    </div>
                  </section>
                  <button
                    type="button"
                    className="node-library-primary-action"
                    onClick={() => onSelectNode(selectedRealNode.id)}
                  >
                    打开节点详情
                  </button>
                </>
              ) : (
                <section>
                  <h3>数据状态</h3>
                  <p>
                    当前是流程概念节点，已对齐主界面模块；后续补公司、行情或供需证据后，
                    可以升级为可投资节点。
                  </p>
                </section>
              )}
            </>
          ) : (
            <p>当前阶段暂无节点。</p>
          )}
        </aside>
      </div>
    </section>
  );
}

function WorkspaceDataPanel({
  view,
  nodes,
  companies,
  edges,
  marketSnapshots,
  supplyRelations,
  subnodeCompanyCoverages,
  selectedStageId,
  selectedNodeId,
  onSelectStage,
  onOpenStageInCanvas,
  onSelectNode,
}: {
  view: Exclude<WorkspaceView, "canvas">;
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  selectedStageId: AtlasStageId;
  selectedNodeId: string | null;
  onSelectStage: (stageId: AtlasStageId) => void;
  onOpenStageInCanvas: (stageId: AtlasStageId) => void;
  onSelectNode: (nodeId: string) => void;
}) {
  if (view === "nodes") {
    return (
      <NodeLibraryPanel
        nodes={nodes}
        companies={companies}
        subnodeCompanyCoverages={subnodeCompanyCoverages}
        selectedStageId={selectedStageId}
        selectedNodeId={selectedNodeId}
        onSelectStage={onSelectStage}
        onOpenStageInCanvas={onOpenStageInCanvas}
        onSelectNode={onSelectNode}
      />
    );
  }

  if (view === "companies") {
    const mountedRoleCount = nodes.reduce(
      (total, node) => total + node.companyIds.length,
      0,
    );

    return (
      <section className="workspace-data-panel" aria-label="公司库">
        <header>
          <h1>公司库</h1>
          <p>公司基本资料独立维护，后续再按节点挂龙头公司、国内外分类和业务标签。</p>
        </header>
        <div className="workspace-status-grid" aria-label="公司数据完整度">
          <article>
            <strong>{companies.length} 家公司</strong>
            <small>当前代表公司主数据</small>
          </article>
          <article>
            <strong>{mountedRoleCount} 个节点挂载</strong>
            <small>公司与节点的当前关联覆盖</small>
          </article>
        </div>
        <div className="workspace-table" role="table" aria-label="代表公司预览">
          <div role="row">
            <strong role="columnheader">公司</strong>
            <strong role="columnheader">代码</strong>
            <strong role="columnheader">市场</strong>
            <strong role="columnheader">挂载节点数</strong>
          </div>
          {companies.slice(0, 12).map((company) => (
            <div role="row" key={company.id}>
              <span role="cell">{company.name}</span>
              <span role="cell">{company.ticker}</span>
              <span role="cell">
                {company.exchange} · {company.market}
              </span>
              <span role="cell">
                {nodes.filter((node) => node.companyIds.includes(company.id)).length}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (view === "markets") {
    return (
      <section className="workspace-data-panel" aria-label="行情数据">
        <header>
          <h1>行情数据</h1>
          <p>股价、涨跌幅、市值、PE、PS 与更新时间放在这里，不进入主流程画布。</p>
        </header>
        <div className="workspace-status-grid" aria-label="行情数据完整度">
          <article data-state={marketSnapshots.length ? "ready" : "empty"}>
            <strong>{marketSnapshots.length} 条行情快照</strong>
            <small>
              {marketSnapshots.length ? "已接入行情数据" : "行情源未接入"}
            </small>
          </article>
        </div>
        <div className="workspace-placeholder-list">
          {["实时股价", "市盈率 PE", "市值 / PS", "交易所与币种", "更新时间"].map((item) => (
            <article key={item}>
              <strong>{item}</strong>
              <small>待接每日更新数据源</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (view === "supply") {
    return (
      <section className="workspace-data-panel" aria-label="供需关系">
        <header>
          <h1>供需关系</h1>
          <p>这里承接多对多上下游关系，包含关系类型、证据来源和置信度；主画布只保留稳定链路。</p>
        </header>
        <div className="workspace-status-grid" aria-label="供需数据完整度">
          <article>
            <strong>{edges.length} 条产业链边</strong>
            <small>节点之间的稳定产业链关系</small>
          </article>
          <article data-state={supplyRelations.length > 1 ? "ready" : "partial"}>
            <strong>{supplyRelations.length} 条公司级供需关系</strong>
            <small>
              {supplyRelations.length > 1
                ? "公司供应关系已接入"
                : "供应关系数据待补全"}
            </small>
          </article>
        </div>
        <div className="workspace-table" role="table" aria-label="产业边预览">
          <div role="row">
            <strong role="columnheader">上游</strong>
            <strong role="columnheader">下游</strong>
            <strong role="columnheader">类型</strong>
          </div>
          {edges.slice(0, 14).map((edge) => (
            <div role="row" key={edge.id}>
              <span role="cell">{nodes.find((node) => node.id === edge.from)?.name ?? edge.from}</span>
              <span role="cell">{nodes.find((node) => node.id === edge.to)?.name ?? edge.to}</span>
              <span role="cell">{relationshipTypeLabels[edge.type]}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-data-panel" aria-label="数据设置">
      <header>
        <h1>数据设置</h1>
        <p>后续每日更新、行情接口、公司映射和供应关系数据源统一放在这里配置。</p>
      </header>
      <div className="workspace-placeholder-list">
        {["公司主数据", "行情接口", "供应关系证据", "更新时间策略"].map((item) => (
          <article key={item}>
            <strong>{item}</strong>
            <small>待配置</small>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ThreeLayerAtlasCanvas({
  nodes,
  companies,
  edges,
  marketSnapshots,
  supplyRelations,
  subnodeCompanyCoverages,
  activeView,
  selectedStageId,
  selectedNodeId,
  search,
  empty,
  onChangeView,
  onSelectStage,
  onOpenStageInCanvas,
  onSelectNode,
  onResetSearch,
}: ThreeLayerAtlasCanvasProps) {
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const nodeIdSet = useMemo(
    () => new Set(nodes.map(({ id }) => id)),
    [nodes],
  );
  const selectedNodeStageId = selectedNodeId
    ? getStageIdForNode(selectedNodeId)
    : null;
  const searchStage = findStageBySearch(search);
  const pinnedStageId =
    selectedStageId !== defaultStageId ? selectedStageId : null;
  const activeStageId =
    selectedNodeStageId ?? pinnedStageId ?? searchStage?.id ?? selectedStageId;
  const stage =
    atlasStageById.get(activeStageId) ??
    atlasStageById.get(defaultStageId) ??
    null;
  const visibleEdges = useMemo(
    () => edges.filter(({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to)),
    [edges, nodeIdSet],
  );
  const related = selectedNodeId
    ? getNeighborhood(selectedNodeId, visibleEdges)
    : null;

  useEffect(() => {
    if (selectedNodeStageId && activeStageId !== selectedStageId) {
      onSelectStage(activeStageId);
    }
  }, [activeStageId, onSelectStage, selectedNodeStageId, selectedStageId]);

  return (
    <section
      className="atlas-workbench"
      aria-label="AI 产业链图谱工作台"
    >
      <CanvasNavigation activeView={activeView} onChangeView={onChangeView} />

      {empty || !stage ? (
        <div className="atlas-workbench-main">
          <div className="poster-empty">
            <p>没有找到匹配的节点或公司</p>
            <button type="button" onClick={onResetSearch}>
              重置搜索
            </button>
          </div>
        </div>
      ) : activeView === "canvas" ? (
        <div className="atlas-workbench-main">
          <h2 className="visually-hidden">AI 产业链三层地图</h2>
          <SwimlaneCanvas
            activeStageId={activeStageId}
            onSelectStage={onSelectStage}
          />
          <StageInspector
            stage={stage}
            nodes={nodeById}
            companies={companyById}
            selectedNodeId={selectedNodeId}
            related={related}
            onSelectNode={onSelectNode}
          />
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
        </div>
      ) : (
        <div className="atlas-workbench-main atlas-workbench-main-data">
          <WorkspaceDataPanel
            view={activeView}
            nodes={nodes}
            companies={companies}
            edges={visibleEdges}
            marketSnapshots={marketSnapshots}
            supplyRelations={supplyRelations}
            subnodeCompanyCoverages={subnodeCompanyCoverages}
            selectedStageId={activeStageId}
            selectedNodeId={selectedNodeId}
            onSelectStage={(stageId) => {
              onSelectStage(stageId);
            }}
            onOpenStageInCanvas={(stageId) => {
              onOpenStageInCanvas(stageId);
            }}
            onSelectNode={onSelectNode}
          />
        </div>
      )}
    </section>
  );
}
