import { StageNodeButton } from "@/components/atlas/stage-node-button";
import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";
import type { AtlasStage, StageDiagramNode } from "@/lib/atlas/stage-map";

interface StageDetailProps {
  stage: AtlasStage;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

const internalConnectionKindLabels = {
  flow: "产品 / 物料流",
  enable: "制造使能",
} as const;

function DiagramNode({
  node,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: {
  node: StageDiagramNode;
  nodes: ReadonlyMap<string, AtlasNode>;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const realNode = node.realNodeId ? nodes.get(node.realNodeId) : undefined;

  if (realNode) {
    return (
      <div className="stage-real-node">
        {node.label !== realNode.name ? (
          <span className="stage-node-alias">{node.label}</span>
        ) : null}
        <StageNodeButton
          node={realNode}
          companies={companies}
          selectedNodeId={selectedNodeId}
          related={related}
          onSelectNode={onSelectNode}
        />
      </div>
    );
  }

  return (
    <span className="stage-diagram-node" data-kind={node.kind} title={node.detail}>
      <strong>{node.label}</strong>
      <small>{node.detail}</small>
    </span>
  );
}

export function StageDetail({
  stage,
  nodes,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageDetailProps) {
  const sections = [
    { id: "inputs", title: "输入", nodes: stage.diagram.inputs },
    { id: "core", title: "内部模块", nodes: stage.diagram.core },
    { id: "outputs", title: "输出", nodes: stage.diagram.outputs },
  ] as const;

  return (
    <section className="stage-detail" data-tone={stage.tone}>
      <header className="three-layer-section-heading">
        <span>2</span>
        <div>
          <p>完整内部流程图</p>
          <h2>{stage.name}完整内部流程图</h2>
          <p>{stage.diagram.summary}</p>
        </div>
      </header>

      <div className="stage-diagram" aria-label={`${stage.name}完整内部流程图`}>
        {sections.map((section) => (
          <div
            className="stage-diagram-column"
            data-section={section.id}
            key={section.id}
          >
            <h3>{section.title}</h3>
            <div className="stage-diagram-node-list">
              {section.nodes.map((node) => (
                <DiagramNode
                  key={node.id}
                  node={node}
                  nodes={nodes}
                  companies={companies}
                  selectedNodeId={selectedNodeId}
                  related={related}
                  onSelectNode={onSelectNode}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <aside
        className="stage-internal-connections"
        aria-label={`${stage.name}内部连接`}
      >
        <h3>内部连接</h3>
        <div>
          {stage.internalConnections.map((connection) => (
            <article data-kind={connection.kind} key={connection.id}>
              <strong>{connection.label}</strong>
              <small>{internalConnectionKindLabels[connection.kind]}</small>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}
