import type { AtlasCompany, AtlasNode } from "@/lib/atlas/schema";

interface StageNodeButtonProps {
  node: AtlasNode;
  companies: ReadonlyMap<string, AtlasCompany>;
  selectedNodeId: string | null;
  related: ReadonlySet<string> | null;
  onSelectNode: (nodeId: string) => void;
}

export function StageNodeButton({
  node,
  companies,
  selectedNodeId,
  related,
  onSelectNode,
}: StageNodeButtonProps) {
  const isSelected = node.id === selectedNodeId;
  const isRelated = related ? related.has(node.id) : true;
  const leaders = node.companyIds
    .map((companyId) => companies.get(companyId))
    .filter((company): company is AtlasCompany => Boolean(company))
    .slice(0, 3);
  const companyNames = leaders.map(({ name }) => name).join(" · ");

  return (
    <button
      id={`atlas-node-${node.id}`}
      className="stage-node-button"
      type="button"
      aria-label={`${node.name} 产业节点`}
      aria-pressed={isSelected}
      data-testid={`node-${node.id}`}
      data-selected={isSelected}
      data-related={isRelated}
      onClick={() => onSelectNode(node.id)}
    >
      <strong>{node.name}</strong>
      <small>{companyNames || "待补公司数据"}</small>
    </button>
  );
}
