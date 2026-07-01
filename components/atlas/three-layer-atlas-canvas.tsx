import { useEffect, useMemo } from "react";

import { StageChain } from "@/components/atlas/stage-chain";
import { StageDataLayer } from "@/components/atlas/stage-data-layer";
import { StageDetail } from "@/components/atlas/stage-detail";
import { getNeighborhood } from "@/lib/atlas/graph";
import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasNode,
} from "@/lib/atlas/schema";
import {
  atlasStageById,
  defaultStageId,
  findStageBySearch,
  getStageIdForNode,
  type AtlasStageId,
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

const relationshipTypeLabels: Readonly<
  Record<AtlasIndustryEdge["type"], string>
> = {
  supply: "供给",
  integrate: "集成",
  deploy: "部署",
};

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
      className="three-layer-workspace"
      aria-label="AI 产业链三层地图画布"
    >
      <div className="poster-scroll">
        {empty || !stage ? (
          <div className="poster-empty">
            <p>没有找到匹配的节点或公司</p>
            <button type="button" onClick={onResetSearch}>
              重置搜索
            </button>
          </div>
        ) : (
          <article className="three-layer-sheet">
            <header className="three-layer-hero">
              <p>从上游材料到下游 AI 应用</p>
              <h1>AI 产业链三层地图</h1>
              <h2 className="visually-hidden">AI 算力模块化地图</h2>
              <small>
                第一眼看 9 段主链；点击阶段看完整内部图；公司、行情、PE
                和供应关系挂在下方结构化数据层。
              </small>
            </header>

            <StageChain
              selectedStageId={activeStageId}
              onSelectStage={onSelectStage}
            />
            <StageDetail
              stage={stage}
              nodes={nodeById}
              companies={companyById}
              selectedNodeId={selectedNodeId}
              related={related}
              onSelectNode={onSelectNode}
            />
            <StageDataLayer
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
          </article>
        )}
      </div>
    </section>
  );
}
