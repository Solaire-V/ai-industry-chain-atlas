import {
  getNeighborhood,
  layoutByRank,
  type RelationshipMode,
} from "@/lib/atlas/graph";
import type {
  AtlasIndustryEdge,
  AtlasNode,
} from "@/lib/atlas/schema";

const nodeDisplayNames: Readonly<Record<string, string>> = {
  "inp-material": "InP材料",
  "low-loss-ccl": "低损耗CCL",
  "high-layer-pcb": "高多层PCB",
  "optical-chip": "光芯片",
  "optical-engine": "光引擎",
  cpo: "CPO",
  "switch-asic": "交换ASIC",
  "ethernet-switch": "交换系统",
  "ai-server": "AI服务器",
  "ai-cluster": "AI集群",
};

interface RelationshipCanvasProps {
  title: string;
  nodes: readonly AtlasNode[];
  edges: readonly AtlasIndustryEdge[];
  mode: RelationshipMode;
  selectedNodeId: string | null;
  empty: boolean;
  onSelectNode: (nodeId: string) => void;
  onResetSearch: () => void;
}

export function RelationshipCanvas({
  title,
  nodes,
  edges,
  mode,
  selectedNodeId,
  empty,
  onSelectNode,
  onResetSearch,
}: RelationshipCanvasProps) {
  const nodeIds = nodes.map(({ id }) => id);
  const nodeIdSet = new Set(nodeIds);
  const visibleEdges = edges.filter(
    ({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to),
  );
  const layout = layoutByRank(nodeIds, visibleEdges);
  const positionById = new Map(layout.map((position) => [position.id, position]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const related = selectedNodeId
    ? getNeighborhood(selectedNodeId, visibleEdges)
    : null;
  const maxX = layout.reduce((maximum, position) => Math.max(maximum, position.x), 0);
  const maxY = layout.reduce((maximum, position) => Math.max(maximum, position.y), 0);
  const width = Math.max(760, maxX + 220);
  const height = Math.max(590, maxY + 240);

  return (
    <section className="relationship-workspace" aria-label={`${title}画布`}>
      <h1>{title}</h1>
      <div className="relationship-scroll">
        {empty ? (
          <div className="canvas-empty">
            <p>没有找到匹配的节点或公司</p>
            <button type="button" onClick={onResetSearch}>
              重置搜索
            </button>
          </div>
        ) : (
          <div className="relationship-canvas" style={{ width, minHeight: height }}>
            <div className="visually-hidden" aria-label="可见产业关系">
              <h2>可见产业关系</h2>
              <ul>
                {visibleEdges.map((edge) => (
                  <li key={`summary-${edge.id}`}>
                    {nodeById.get(edge.from)?.name ?? edge.from} → {nodeById.get(edge.to)?.name ?? edge.to}（{edge.type}）
                  </li>
                ))}
              </ul>
            </div>
            <svg
              className="relationship-lines"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={`arrow-related-${mode}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path className="arrow-related" d="M0,0 L8,4 L0,8 Z" />
                </marker>
                <marker
                  id={`arrow-subdued-${mode}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 Z" />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const from = positionById.get(edge.from);
                const to = positionById.get(edge.to);
                if (!from || !to) return null;
                const edgeRelated = selectedNodeId
                  ? edge.from === selectedNodeId || edge.to === selectedNodeId
                  : true;
                return (
                  <path
                    key={edge.id}
                    className={edgeRelated ? "path-related" : "path-subdued"}
                    d={`M ${from.x + 150} ${from.y + 131} C ${from.x + 185} ${from.y + 131}, ${to.x + 5} ${to.y + 131}, ${to.x + 40} ${to.y + 131}`}
                    markerEnd={`url(#arrow-${edgeRelated ? "related" : "subdued"}-${mode})`}
                  />
                );
              })}
            </svg>
            {nodes.map((node) => {
              const position = positionById.get(node.id);
              if (!position) return null;
              const isSelected = node.id === selectedNodeId;
              const isRelated = related ? related.has(node.id) : true;
              return (
                <button
                  key={node.id}
                  className="graph-node"
                  type="button"
                  style={{ left: position.x + 40, top: position.y + 100 }}
                  aria-label={`${node.name} 产业节点`}
                  aria-pressed={isSelected}
                  data-testid={`node-${node.id}`}
                  data-selected={isSelected}
                  data-related={isRelated}
                  onClick={() => onSelectNode(node.id)}
                >
                  {nodeDisplayNames[node.id] ?? node.name}
                </button>
              );
            })}
            <div className="relationship-legend" aria-hidden="true">
              <span>关系图例</span>
              <i className="legend-selected" />选中路径（上下游）
              <i />其他关系
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
