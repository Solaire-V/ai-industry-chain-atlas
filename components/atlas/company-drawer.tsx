import { useEffect, useMemo, useRef, useState } from "react";

import { presentMarketSnapshot } from "@/lib/atlas/market";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasNode,
  AtlasSource,
  AtlasSupplyRelation,
  CompanyNodeRole,
} from "@/lib/atlas/schema";

interface CompanyDrawerProps {
  company: AtlasCompany;
  returnNode: AtlasNode | null;
  companies: readonly AtlasCompany[];
  nodes: readonly AtlasNode[];
  roles: readonly CompanyNodeRole[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  sources: readonly AtlasSource[];
  onBack: () => void;
  onSelectNode: (node: AtlasNode) => void;
}

const STATUS_ORDER: Record<AtlasSupplyRelation["status"], number> = {
  company_confirmed: 0,
  counterparty_confirmed: 1,
  regulatory_disclosure: 2,
  multi_source_report: 3,
  market_speculation: 4,
};

const STATUS_LABEL: Record<AtlasSupplyRelation["status"], string> = {
  company_confirmed: "公司确认",
  counterparty_confirmed: "交易对手确认",
  regulatory_disclosure: "监管披露",
  multi_source_report: "多来源报道",
  market_speculation: "市场推测",
};

export function CompanyDrawer({
  company,
  returnNode,
  companies,
  nodes,
  roles,
  marketSnapshots,
  supplyRelations,
  sources,
  onBack,
  onSelectNode,
}: CompanyDrawerProps) {
  const [showSpeculation, setShowSpeculation] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `company-drawer-title-${company.id}`;

  const companyById = useMemo(
    () => new Map(companies.map((item) => [item.id, item])),
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

  const companyRoles = useMemo(
    () => roles.filter(({ companyId }) => companyId === company.id),
    [company.id, roles],
  );
  const relations = useMemo(
    () => supplyRelations
      .filter(
        ({ supplierId, customerId }) =>
          supplierId === company.id || customerId === company.id,
      )
      .toSorted((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [company.id, supplyRelations],
  );
  const verifiedRelations = relations.filter(
    ({ status }) => status !== "market_speculation",
  );
  const visibleRelations = showSpeculation
    ? relations
    : verifiedRelations;
  const latestSnapshot = useMemo(() => {
    let latest: AtlasMarketSnapshot | null = null;
    let latestEpoch = Number.NEGATIVE_INFINITY;
    for (const item of marketSnapshots) {
      if (item.companyId !== company.id) continue;
      const epoch = Date.parse(item.tradedAt);
      if (Number.isNaN(epoch) || epoch <= latestEpoch) continue;
      latest = item;
      latestEpoch = epoch;
    }
    return latest;
  }, [company.id, marketSnapshots]);
  const market = presentMarketSnapshot(latestSnapshot);

  useEffect(() => {
    backButtonRef.current?.focus();
    setShowSpeculation(false);
  }, [company.id]);

  return (
    <aside
      className="node-drawer company-drawer"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <button
        ref={backButtonRef}
        className="drawer-back"
        type="button"
        aria-label={returnNode ? `返回${returnNode.name}` : "返回产业图"}
        onClick={onBack}
      >
        ← {returnNode ? `返回${returnNode.name}` : "返回产业图"}
      </button>

      <div className="drawer-content company-drawer-content">
        <header className="drawer-title-block">
          <h2 id={titleId}>{company.name}</h2>
          <p>{company.ticker}</p>
          <p>{company.currency} · {company.exchange} · {company.market}</p>
        </header>

        <section>
          <h3>市场数据</h3>
          <dl className="market-data">
            <div><dt>价格</dt><dd>{market.price}</dd></div>
            <div><dt>涨跌幅</dt><dd>{market.change}</dd></div>
            <div><dt>市盈率 TTM</dt><dd>{market.pe}</dd></div>
            <div><dt>数据状态</dt><dd>{market.freshness}</dd></div>
            <div><dt>交易时间</dt><dd>{market.tradedAt}</dd></div>
            <div><dt>获取时间</dt><dd>{market.fetchedAt}</dd></div>
          </dl>
        </section>

        <section>
          <h3>产业节点与角色</h3>
          <div className="company-list">
            {companyRoles.map((role) => {
              const roleNode = nodeById.get(role.nodeId);
              if (!roleNode) return null;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => onSelectNode(roleNode)}
                >
                  <span><strong>{roleNode.name}</strong></span>
                  <small>{role.role}{role.product ? ` · ${role.product}` : ""}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="supply-heading">
            <h3>公开供需关系</h3>
            <label>
              <input
                type="checkbox"
                checked={showSpeculation}
                onChange={(event) => setShowSpeculation(event.target.checked)}
              />
              显示市场推测
            </label>
          </div>
          {verifiedRelations.length === 0 ? (
            <p>暂无公开确认的供需关系</p>
          ) : null}
          <ul className="supply-list">
            {visibleRelations.map((relation) => {
              const isSupplier = relation.supplierId === company.id;
              const counterpart = companyById.get(
                isSupplier ? relation.customerId : relation.supplierId,
              );
              const relationNode = nodeById.get(relation.nodeId);
              return (
                <li key={relation.id}>
                  <p className="supply-direction">
                    {isSupplier ? "供应给" : "采购自"} {counterpart?.name ?? "未知公司"}
                  </p>
                  <p>{relation.product}</p>
                  <dl className="supply-meta">
                    <div><dt>节点</dt><dd>{relationNode?.name ?? relation.nodeId}</dd></div>
                    <div><dt>证据状态</dt><dd>{STATUS_LABEL[relation.status]}</dd></div>
                    <div><dt>公告日期</dt><dd>{relation.announcedAt ?? "未披露"}</dd></div>
                  </dl>
                  <ul className="source-list">
                    {relation.evidenceSourceIds.map((sourceId) => {
                      const source = sourceById.get(sourceId);
                      if (!source) return null;
                      return (
                        <li key={source.id}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                          <small>{source.publisher}</small>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </aside>
  );
}
