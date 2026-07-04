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

const relationStatusLabels: Record<AtlasSupplyRelation["status"], string> = {
  company_confirmed: "公司确认",
  counterparty_confirmed: "交易对手确认",
  regulatory_disclosure: "监管披露",
  multi_source_report: "多来源报道",
  market_speculation: "市场推测",
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

  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="供需关系">
      <header>
        <h1>供需关系</h1>
        <p>公司级供应关系和节点级产业链边分开看：前者用于投研验证，后者用于理解链路流向。</p>
      </header>

      <div className="workspace-status-grid" aria-label="供需数据状态">
        <article>
          <strong>{supplyRelations.length} 条公司级供需关系</strong>
          <small>{verifiedRelations.length} 条非投机关系</small>
        </article>
        <article>
          <strong>{edges.length} 条产业链边</strong>
          <small>节点之间的稳定产业链连接</small>
        </article>
      </div>

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
  );
}
