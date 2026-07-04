import { useMemo } from "react";

import type {
  AtlasCompany,
  AtlasIndustryEdge,
  AtlasNode,
  AtlasSource,
  AtlasSupplyRelation,
} from "@/lib/atlas/schema";

interface SupplyRelationsPanelProps {
  nodes: readonly AtlasNode[];
  companies: readonly AtlasCompany[];
  edges: readonly AtlasIndustryEdge[];
  supplyRelations: readonly AtlasSupplyRelation[];
  sources: readonly AtlasSource[];
}

const relationshipTypeLabels: Record<AtlasIndustryEdge["type"], string> = {
  supply: "供应",
  integrate: "集成",
  deploy: "落地",
};

const relationshipGroupLabels: Record<AtlasIndustryEdge["type"], string> = {
  supply: "供应链路",
  integrate: "集成链路",
  deploy: "落地链路",
};

const relationshipTypeOrder: readonly AtlasIndustryEdge["type"][] = [
  "supply",
  "integrate",
  "deploy",
];

const relationStatusLabels: Record<AtlasSupplyRelation["status"], string> = {
  company_confirmed: "公司确认",
  counterparty_confirmed: "交易对手确认",
  regulatory_disclosure: "监管披露",
  multi_source_report: "多来源报道",
  market_speculation: "市场推测",
};

const displayNodeName = (node: AtlasNode | undefined, fallback: string) => {
  if (!node) return fallback;
  if (node.id === "inp-material") return "InP 衬底";
  return node.name;
};

export function SupplyRelationsPanel({
  nodes,
  companies,
  edges,
  supplyRelations,
  sources,
}: SupplyRelationsPanelProps) {
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const verifiedRelations = supplyRelations.filter(
    ({ status }) => status !== "market_speculation",
  );
  const relationNodeIds = new Set(supplyRelations.map((relation) => relation.nodeId));
  const relationNodes = nodes.filter((node) => relationNodeIds.has(node.id));
  const chainOnlyNodeCount = Math.max(0, nodes.length - relationNodes.length);
  const supplierCount = new Set(supplyRelations.map((relation) => relation.supplierId)).size;
  const customerCount = new Set(supplyRelations.map((relation) => relation.customerId)).size;
  const relationByType = useMemo(
    () =>
      relationshipTypeOrder.map((type) => ({
        type,
        edges: edges.filter((edge) => edge.type === type),
      })),
    [edges],
  );

  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="供需关系">
      <header className="data-page-header">
        <h1>供需关系</h1>
        <div className="data-kpi-strip" aria-label="供需数据状态">
          <article>
            <span>公司关系</span>
            <strong>{supplyRelations.length} 条</strong>
            <small>{verifiedRelations.length} 条非投机关系</small>
          </article>
          <article>
            <span>链路</span>
            <strong>{edges.length} 条</strong>
            <small>节点级边</small>
          </article>
          <article>
            <span>覆盖节点</span>
            <strong>{relationNodes.length} / {nodes.length}</strong>
            <small>{chainOnlyNodeCount} 个待补证据</small>
          </article>
          <article>
            <span>公司</span>
            <strong>{supplierCount} / {customerCount}</strong>
            <small>供应方 / 客户</small>
          </article>
        </div>
      </header>

      <div className="supply-workbench-grid" aria-label="供需投研区">
        <section className="supply-dashboard-section supply-relations-panel">
          <header>
            <h2>公司关系</h2>
          </header>
          <div className="workspace-table-scroll">
            <table className="workspace-data-table supply-data-table" aria-label="公司供需表">
              <thead>
                <tr>
                  <th>供应方</th>
                  <th>客户</th>
                  <th>节点</th>
                  <th>产品 / 关系</th>
                  <th>可信度</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {supplyRelations.map((relation) => {
                  const supplier = companyById.get(relation.supplierId);
                  const customer = companyById.get(relation.customerId);
                  const node = nodeById.get(relation.nodeId);
                  const relationSources = relation.evidenceSourceIds
                    .map((sourceId) => sourceById.get(sourceId))
                    .filter((source): source is AtlasSource => Boolean(source));

                  return (
                    <tr key={relation.id}>
                      <td>{supplier?.name ?? relation.supplierId}</td>
                      <td>{customer?.name ?? relation.customerId}</td>
                      <td>{node?.name ?? relation.nodeId}</td>
                      <td>{relation.product}</td>
                      <td>{relationStatusLabels[relation.status]}</td>
                      <td>{relationSources[0]?.publisher ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="supply-dashboard-section supply-chain-panel">
          <header>
            <h2>节点链路</h2>
          </header>
          <div className="supply-chain-groups" aria-label="节点链路分组">
            {relationByType.map(({ type, edges: groupedEdges }) => (
              <article className="supply-chain-group" key={type}>
                <header>
                  <h3>{relationshipGroupLabels[type]}</h3>
                  <small>{groupedEdges.length} 条</small>
                </header>
                <ol>
                  {groupedEdges.slice(0, 8).map((edge) => {
                    const fromNode = nodeById.get(edge.from);
                    const toNode = nodeById.get(edge.to);

                    return (
                      <li key={edge.id}>
                        {displayNodeName(fromNode, edge.from)} → {displayNodeName(toNode, edge.to)}
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="supply-dashboard-section supply-edge-panel">
        <header>
          <h2>链路明细</h2>
        </header>
        <div className="workspace-table-scroll">
          <table className="workspace-data-table edge-data-table" aria-label="产业链边表">
            <thead>
              <tr>
                <th>上游</th>
                <th>下游</th>
                <th>类型</th>
              </tr>
            </thead>
            <tbody>
              {edges.map((edge) => (
                <tr key={edge.id}>
                  <td>{nodeById.get(edge.from)?.name ?? edge.from}</td>
                  <td>{nodeById.get(edge.to)?.name ?? edge.to}</td>
                  <td>{relationshipTypeLabels[edge.type]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
