import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { StageNodeButton } from "@/components/atlas/stage-node-button";
import { getNeighborhood } from "@/lib/atlas/graph";
import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasNode,
} from "@/lib/atlas/schema";
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
} from "@/lib/atlas/stage-map";

interface ThreeLayerAtlasCanvasProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  selectedStageId: AtlasStageId;
  selectedNodeId: string | null;
  search: string;
  empty: boolean;
  onSelectStage: (stageId: AtlasStageId) => void;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

type WorkspaceView =
  | "canvas"
  | "nodes"
  | "companies"
  | "markets"
  | "supply"
  | "settings";

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

function WorkspaceDataPanel({
  view,
  nodes,
  companies,
  edges,
  selectedStageId,
  onSelectStage,
}: {
  view: Exclude<WorkspaceView, "canvas">;
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  selectedStageId: AtlasStageId;
  onSelectStage: (stageId: AtlasStageId) => void;
}) {
  if (view === "nodes") {
    return (
      <section className="workspace-data-panel" aria-label="节点库">
        <header>
          <h1>节点库</h1>
          <p>这里承接细分材料、设备、芯片、封装、光互联等最小节点；主界面不再堆这些内容。</p>
        </header>
        <div className="workspace-data-grid">
          {atlasStages.map((stage) => (
            <article key={stage.id} data-active={stage.id === selectedStageId}>
              <button type="button" onClick={() => onSelectStage(stage.id)}>
                {String(stage.order).padStart(2, "0")} · {stage.name}
              </button>
              <p>{stage.summary}</p>
              <small>
                {stage.groups.reduce((count, group) => count + group.nodes.length, 0)}
                个细分节点
              </small>
              <div className="workspace-node-tags">
                {stage.groups.flatMap((group) =>
                  group.nodes.map((node) => (
                    <span key={`${group.id}-${node.id}`}>{node.label}</span>
                  )),
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (view === "companies") {
    return (
      <section className="workspace-data-panel" aria-label="公司库">
        <header>
          <h1>公司库</h1>
          <p>公司基本资料独立维护，后续再按节点挂龙头公司、国内外分类和业务标签。</p>
        </header>
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
  selectedStageId,
  selectedNodeId,
  search,
  empty,
  onSelectStage,
  onSelectNode,
  onResetSearch,
}: ThreeLayerAtlasCanvasProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>("canvas");
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
      <CanvasNavigation activeView={activeView} onChangeView={setActiveView} />

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
            selectedStageId={activeStageId}
            onSelectStage={(stageId) => {
              setActiveView("canvas");
              onSelectStage(stageId);
            }}
          />
        </div>
      )}
    </section>
  );
}
