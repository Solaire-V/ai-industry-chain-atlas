import { StageNodeButton } from "@/components/atlas/stage-node-button";
import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";
import type { AtlasStage } from "@/lib/atlas/stage-map";

interface StageDataLayerProps {
  stage: AtlasStage;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

export function StageDataLayer({
  stage,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageDataLayerProps) {
  const diagramNodes = [
    ...stage.diagram.inputs,
    ...stage.diagram.core,
    ...stage.diagram.outputs,
  ];
  const diagramRealNodeIds = new Set(
    diagramNodes.flatMap(({ realNodeId }) => (realNodeId ? [realNodeId] : [])),
  );
  const diagramLabels = new Set(diagramNodes.map(({ label }) => label));

  return (
    <section
      className="stage-data-layer"
      aria-label={`${stage.name}可更新数据层`}
    >
      <header className="three-layer-section-heading">
        <span>3</span>
        <div>
          <h2>可更新数据层</h2>
          <p>公司、行情、市盈率和供应关系挂在结构化节点上，不写死在图片里。</p>
        </div>
      </header>

      <div className="stage-data-grid">
        {stage.groups.map((group) => (
          <article className="stage-data-group" key={group.id}>
            <h3>数据组 · {group.title}</h3>
            <p>{group.summary}</p>
            <div className="stage-subnode-list">
              {group.nodes.map((subnode) => {
                const realNode = subnode.realNodeId
                  ? nodes.get(subnode.realNodeId)
                  : undefined;
                const isDuplicateRealNode = realNode
                  ? diagramRealNodeIds.has(realNode.id)
                  : false;
                const shouldDisambiguateLabel =
                  isDuplicateRealNode || diagramLabels.has(subnode.label);

                return realNode && !isDuplicateRealNode ? (
                  <div className="stage-real-node" key={subnode.id}>
                    {subnode.label !== realNode.name ? (
                      <span className="stage-node-alias">{subnode.label}</span>
                    ) : null}
                    <StageNodeButton
                      node={realNode}
                      companies={companies}
                      selectedNodeId={selectedNodeId}
                      related={related}
                      onSelectNode={onSelectNode}
                    />
                  </div>
                ) : (
                    <span
                      className="stage-subnode"
                      data-kind={subnode.kind}
                      key={subnode.id}
                      title={subnode.description}
                    >
                    <strong>
                      {shouldDisambiguateLabel
                        ? `数据项 · ${subnode.label}`
                        : subnode.label}
                    </strong>
                    <small>待接公司数据</small>
                  </span>
                );
              })}
            </div>
          </article>
        ))}

        <article className="stage-data-group stage-data-placeholder">
          <h3>公司 / 行情 / PE</h3>
          <p>后续每日更新公司股价、市盈率、市值和更新时间；当前不在此处硬编码行情。</p>
          <div className="stage-subnode-list">
            <span className="stage-subnode">
              <strong>代表公司</strong>
              <small>待接节点挂载</small>
            </span>
            <span className="stage-subnode">
              <strong>行情</strong>
              <small>待接数据源</small>
            </span>
            <span className="stage-subnode">
              <strong>PE</strong>
              <small>待接估值指标</small>
            </span>
          </div>
        </article>

        <article className="stage-data-group stage-data-placeholder">
          <h3>供应关系 / 证据</h3>
          <p>后续用边承载供应商、客户、证据来源和置信度；当前只保留占位结构。</p>
          <div className="stage-subnode-list">
            <span className="stage-subnode">
              <strong>供应关系</strong>
              <small>待接公司边</small>
            </span>
            <span className="stage-subnode">
              <strong>证据来源</strong>
              <small>待接公告 / 报告</small>
            </span>
            <span className="stage-subnode">
              <strong>置信度</strong>
              <small>待接关系状态</small>
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
