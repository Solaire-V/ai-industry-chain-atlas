import { useEffect, useMemo, useState } from "react";

import {
  buildCompanyResearchRows,
  type CompanyMarketFilter,
  type CompanyResearchRow,
} from "@/lib/atlas/company-research";
import { buildAtlasDataFreshness } from "@/lib/atlas/data-freshness";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  AtlasSource,
  AtlasSupplyRelation,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";
import { atlasStages, type AtlasStageId } from "@/lib/atlas/stage-map";

interface CompanyLibraryPanelProps {
  companies: readonly AtlasCompany[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  supplyRelations: readonly AtlasSupplyRelation[];
  sources: readonly AtlasSource[];
}

type PriorityFilter = "all" | SubnodeCompanyCoverage["priority"];
type MarketDataFilter = "all" | "with-market" | "without-market";
type SupplyFilter = "all" | "verified" | "none";

const marketFilters: readonly { id: CompanyMarketFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "ashare", label: "A股" },
  { id: "other", label: "其他" },
];

const priorityFilters: readonly { id: PriorityFilter; label: string }[] = [
  { id: "all", label: "全部角色" },
  { id: "leader", label: "龙头" },
  { id: "important", label: "重点参与" },
  { id: "supplementary", label: "补充观察" },
  { id: "watch", label: "观察" },
];

const marketDataFilters: readonly { id: MarketDataFilter; label: string }[] = [
  { id: "all", label: "全部行情" },
  { id: "with-market", label: "有行情" },
  { id: "without-market", label: "待接行情" },
];

const supplyFilters: readonly { id: SupplyFilter; label: string }[] = [
  { id: "all", label: "全部供需" },
  { id: "verified", label: "有确认关系" },
  { id: "none", label: "待补关系" },
];

const priorityLabels: Record<CompanyResearchRow["priority"], string> = {
  leader: "龙头",
  important: "重点参与",
  supplementary: "补充观察",
  watch: "观察",
  none: "待映射",
};

const relationStatusLabels: Record<AtlasSupplyRelation["status"], string> = {
  company_confirmed: "公司确认",
  counterparty_confirmed: "交易对手确认",
  regulatory_disclosure: "监管披露",
  multi_source_report: "多来源报道",
  market_speculation: "市场推测",
};

const displayMetric = (value: string) => value === "N/A" ? "—" : value;

const displayDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-CN");
};

const positionLabel = (row: CompanyResearchRow) =>
  row.primaryPosition
    ? `${row.primaryPosition.stageName} / ${row.primaryPosition.subnodeLabel}`
    : "待映射";

const matchesStage = (row: CompanyResearchRow, stageFilter: "all" | AtlasStageId) =>
  stageFilter === "all" ||
  row.positions.some(({ stageId }) => stageId === stageFilter);

const matchesPriority = (row: CompanyResearchRow, priorityFilter: PriorityFilter) =>
  priorityFilter === "all" || row.priority === priorityFilter;

const matchesMarketData = (
  row: CompanyResearchRow,
  marketDataFilter: MarketDataFilter,
) => {
  if (marketDataFilter === "with-market") return Boolean(row.latestMarketSnapshot);
  if (marketDataFilter === "without-market") return !row.latestMarketSnapshot;
  return true;
};

const matchesSupply = (row: CompanyResearchRow, supplyFilter: SupplyFilter) => {
  if (supplyFilter === "verified") return row.verifiedRelationCount > 0;
  if (supplyFilter === "none") return row.verifiedRelationCount === 0;
  return true;
};

export function CompanyLibraryPanel({
  companies,
  subnodeCompanyCoverages,
  marketSnapshots,
  supplyRelations,
  sources,
}: CompanyLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<CompanyMarketFilter>("all");
  const [stageFilter, setStageFilter] = useState<"all" | AtlasStageId>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [marketDataFilter, setMarketDataFilter] =
    useState<MarketDataFilter>("all");
  const [supplyFilter, setSupplyFilter] = useState<SupplyFilter>("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const rows = useMemo(
    () =>
      buildCompanyResearchRows({
        companies,
        subnodeCompanyCoverages,
        marketSnapshots,
        supplyRelations,
      }),
    [companies, marketSnapshots, subnodeCompanyCoverages, supplyRelations],
  );
  const dataFreshness = useMemo(
    () => buildAtlasDataFreshness({ companies, marketSnapshots }),
    [companies, marketSnapshots],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (normalizedQuery && !row.searchableText.includes(normalizedQuery)) {
          return false;
        }
        if (marketFilter !== "all" && row.marketGroup !== marketFilter) {
          return false;
        }
        return matchesStage(row, stageFilter) &&
          matchesPriority(row, priorityFilter) &&
          matchesMarketData(row, marketDataFilter) &&
          matchesSupply(row, supplyFilter);
      }),
    [marketDataFilter, marketFilter, normalizedQuery, priorityFilter, rows, stageFilter, supplyFilter],
  );

  useEffect(() => {
    if (filteredRows.some(({ company }) => company.id === selectedCompanyId)) {
      return;
    }
    setSelectedCompanyId(filteredRows[0]?.company.id ?? null);
  }, [filteredRows, selectedCompanyId]);

  const selectedRow =
    filteredRows.find(({ company }) => company.id === selectedCompanyId) ?? null;
  const marketCounts = {
    all: rows.length,
    ashare: rows.filter((row) => row.marketGroup === "ashare").length,
    other: rows.filter((row) => row.marketGroup === "other").length,
  } satisfies Record<CompanyMarketFilter, number>;

  return (
    <section className="workspace-data-panel company-library-panel" aria-label="公司库">
      <header className="company-library-header">
        <div>
          <h1>公司库</h1>
          <p>按产业位置、市场、角色、行情和供需关系筛选公司。</p>
        </div>
      </header>

      <div className="company-library-layout">
        <aside className="company-library-filters" aria-label="公司筛选">
          <label className="company-library-search">
            <span>搜索公司</span>
            <input
              aria-label="搜索公司"
              type="search"
              value={query}
              placeholder="公司名 / 代码 / 节点"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <fieldset>
            <legend>市场</legend>
            <div className="company-library-filter-tabs">
              {marketFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={marketFilter === filter.id}
                  onClick={() => setMarketFilter(filter.id)}
                >
                  {filter.label} {marketCounts[filter.id]}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            <span>产业环节</span>
            <select
              aria-label="产业环节"
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(event.target.value as "all" | AtlasStageId)
              }
            >
              <option value="all">全部环节</option>
              {atlasStages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {String(stage.order).padStart(2, "0")} · {stage.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>公司角色</span>
            <select
              aria-label="公司角色"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value as PriorityFilter)
              }
            >
              {priorityFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>行情状态</span>
            <select
              aria-label="行情状态"
              value={marketDataFilter}
              onChange={(event) =>
                setMarketDataFilter(event.target.value as MarketDataFilter)
              }
            >
              {marketDataFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>供需状态</span>
            <select
              aria-label="供需状态"
              value={supplyFilter}
              onChange={(event) =>
                setSupplyFilter(event.target.value as SupplyFilter)
              }
            >
              {supplyFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </aside>

        <main className="company-library-browser" aria-label="公司清单">
          <div className="company-library-freshness" aria-label="行情数据状态">
            <strong>{dataFreshness.label}</strong>
            <span>
              {dataFreshness.companiesWithMarketData} / {dataFreshness.companyCount} 公司有行情
            </span>
            <span>最新交易 {displayDate(dataFreshness.latestTradedAt)}</span>
          </div>
          <div className="company-library-resultbar">
            <strong>{filteredRows.length} 家公司</strong>
            <small>按 A股、产业角色和节点排序</small>
          </div>
          <div className="company-library-table-wrap">
            <table className="company-library-table" aria-label="公司研究表">
              <thead>
                <tr>
                  <th>公司</th>
                  <th>市场</th>
                  <th>产业位置</th>
                  <th>角色</th>
                  <th>相关节点</th>
                  <th>股价 / 涨跌</th>
                  <th>PE / 市值</th>
                  <th>供需关系</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.company.id}
                    data-selected={selectedRow?.company.id === row.company.id}
                    tabIndex={0}
                    onClick={() => setSelectedCompanyId(row.company.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCompanyId(row.company.id);
                      }
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedCompanyId(row.company.id)}
                      >
                        <strong>{row.company.name}</strong>
                        <small>{row.tickerLabel}</small>
                      </button>
                    </td>
                    <td>
                      <span className="company-library-market-badge">
                        {row.marketLabel}
                      </span>
                    </td>
                    <td>{positionLabel(row)}</td>
                    <td>{priorityLabels[row.priority]}</td>
                    <td>{row.relatedNodeCount} 节点</td>
                    <td>
                      {displayMetric(row.market.price)} /{" "}
                      {displayMetric(row.market.change)}
                    </td>
                    <td>
                      {displayMetric(row.market.pe)} / {displayMetric(row.market.marketCap)}
                    </td>
                    <td>
                      客户 {row.customerCount} / 供应商 {row.supplierCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        <CompanyLibraryDetail row={selectedRow} sourceById={sourceById} />
      </div>
    </section>
  );
}

function CompanyLibraryDetail({
  row,
  sourceById,
}: {
  row: CompanyResearchRow | null;
  sourceById: ReadonlyMap<string, AtlasSource>;
}) {
  if (!row) {
    return (
      <aside className="company-library-detail" aria-label="公司详情">
        <p>没有匹配公司。调整筛选条件后继续查看。</p>
      </aside>
    );
  }

  const verifiedRelations = row.supplyRelations.filter(
    ({ status }) => status !== "market_speculation",
  );
  const evidenceSources = row.sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is AtlasSource => Boolean(source))
    .slice(0, 6);

  return (
    <aside className="company-library-detail" aria-label="公司详情">
      <header>
        <span>{row.marketLabel}</span>
        <h2>{row.company.name}</h2>
        <p>{row.tickerLabel}</p>
        <small>{row.company.currency} · {row.company.exchange}</small>
      </header>

      <section>
        <h3>产业链位置</h3>
        <ul className="company-library-position-list">
          {row.positions.map((position) => (
            <li key={position.coverage.id}>
              <strong>{position.stageName}</strong>
              <span>
                {position.groupTitle} / {position.subnodeLabel}
              </span>
              <small>{position.coverage.role}</small>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>行情估值</h3>
        <dl className="company-library-metrics">
          <div><dt>股价</dt><dd>{displayMetric(row.market.price)}</dd></div>
          <div><dt>涨跌幅</dt><dd>{displayMetric(row.market.change)}</dd></div>
          <div><dt>PE TTM</dt><dd>{displayMetric(row.market.pe)}</dd></div>
          <div><dt>市值</dt><dd>{displayMetric(row.market.marketCap)}</dd></div>
          <div><dt>数据状态</dt><dd>{row.market.freshness}</dd></div>
          <div><dt>交易时间</dt><dd>{displayMetric(row.market.tradedAt)}</dd></div>
        </dl>
      </section>

      <section>
        <h3>供需关系</h3>
        <div className="company-library-supply-summary">
          <span>客户 {row.customerCount}</span>
          <span>供应商 {row.supplierCount}</span>
          <span>已验证 {row.verifiedRelationCount}</span>
        </div>
        {verifiedRelations.length ? (
          <ul className="company-library-relation-list">
            {verifiedRelations.slice(0, 4).map((relation) => (
              <li key={relation.id}>
                <strong>{relation.product}</strong>
                <small>{relationStatusLabels[relation.status]}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无公开确认的供需关系</p>
        )}
      </section>

      <section>
        <h3>证据来源</h3>
        {evidenceSources.length ? (
          <ul className="company-library-source-list">
            {evidenceSources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <small>{source.publisher}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无来源记录</p>
        )}
      </section>
    </aside>
  );
}
