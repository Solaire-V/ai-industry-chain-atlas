import { useMemo } from "react";

import {
  getCompanyMarketLabel,
  getCompanyTickerLabel,
  isAshareCompany,
} from "@/lib/atlas/company-research";
import {
  buildAtlasDataFreshness,
  selectLatestMarketSnapshots,
} from "@/lib/atlas/data-freshness";
import { presentMarketSnapshot } from "@/lib/atlas/market";
import type {
  AtlasCompany,
  AtlasMarketSnapshot,
  SubnodeCompanyCoverage,
} from "@/lib/atlas/schema";
import { atlasStages, type AtlasStageId } from "@/lib/atlas/stage-map";

interface MarketDataPanelProps {
  companies: readonly AtlasCompany[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
  subnodeCompanyCoverages: readonly SubnodeCompanyCoverage[];
}

const displayMetric = (value: string) => value === "N/A" ? "—" : value;

const displayDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN");
};

const snapshotEpoch = (snapshot: AtlasMarketSnapshot | null) => {
  if (!snapshot) return Number.NEGATIVE_INFINITY;
  const epoch = Date.parse(snapshot.tradedAt);
  return Number.isNaN(epoch) ? Number.NEGATIVE_INFINITY : epoch;
};

const formatPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  if (Object.is(value, -0) || value === 0) return "0%";
  if (Math.abs(value) < 0.01) return `${value > 0 ? "+" : "-"}<0.01%`;
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
};

const formatCompactCurrency = (currency: string, value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${currency} ${new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value)}`;
};

type MarketRow = {
  company: AtlasCompany;
  latestSnapshot: AtlasMarketSnapshot | null;
  market: ReturnType<typeof presentMarketSnapshot>;
};

type MarketRowWithSnapshot = MarketRow & {
  latestSnapshot: AtlasMarketSnapshot;
};

const hasLatestSnapshot = (row: MarketRow): row is MarketRowWithSnapshot =>
  Boolean(row.latestSnapshot);

const snapshotChange = (row: MarketRow) => row.latestSnapshot?.changePct ?? null;

const latestTimestamp = (rows: readonly MarketRow[]) => {
  const latest = rows.reduce<string | null>((current, row) => {
    const fetchedAt = row.latestSnapshot?.fetchedAt;
    if (!fetchedAt) return current;
    if (!current) return fetchedAt;
    return Date.parse(fetchedAt) > Date.parse(current) ? fetchedAt : current;
  }, null);
  return displayDate(latest);
};

export function MarketDataPanel({
  companies,
  marketSnapshots,
  subnodeCompanyCoverages,
}: MarketDataPanelProps) {
  const freshness = useMemo(
    () => buildAtlasDataFreshness({ companies, marketSnapshots }),
    [companies, marketSnapshots],
  );
  const latestByCompanyId = useMemo(
    () => selectLatestMarketSnapshots(marketSnapshots),
    [marketSnapshots],
  );
  const rows = useMemo(
    () =>
      companies
        .map((company) => {
          const latestSnapshot = latestByCompanyId.get(company.id) ?? null;
          return {
            company,
            latestSnapshot,
            market: presentMarketSnapshot(latestSnapshot),
          };
        })
        .toSorted(
          (left, right) =>
            Number(Boolean(right.latestSnapshot)) - Number(Boolean(left.latestSnapshot)) ||
            Number(isAshareCompany(right.company)) - Number(isAshareCompany(left.company)) ||
            snapshotEpoch(right.latestSnapshot) - snapshotEpoch(left.latestSnapshot) ||
            left.company.name.localeCompare(right.company.name, "zh-CN"),
        ),
    [companies, latestByCompanyId],
  );
  const rowByCompanyId = useMemo(
    () => new Map(rows.map((row) => [row.company.id, row])),
    [rows],
  );
  const stageSummaries = useMemo(() => {
    const companyIdsByStage = new Map<AtlasStageId, Set<string>>();

    for (const coverage of subnodeCompanyCoverages) {
      const stageId = coverage.stageId as AtlasStageId;
      if (!companyIdsByStage.has(stageId)) {
        companyIdsByStage.set(stageId, new Set());
      }
      companyIdsByStage.get(stageId)?.add(coverage.companyId);
    }

    return atlasStages
      .map((stage) => {
        const stageCompanyIds = [...(companyIdsByStage.get(stage.id) ?? new Set())];
        const stageRows = stageCompanyIds
          .map((companyId) => rowByCompanyId.get(companyId))
          .filter((row): row is MarketRow => Boolean(row));
        const coveredRows = stageRows.filter(hasLatestSnapshot);
        const averageChange = coveredRows.length
          ? coveredRows.reduce((total, row) => total + (row.latestSnapshot?.changePct ?? 0), 0) /
            coveredRows.length
          : null;
        const leader = coveredRows.toSorted(
          (left, right) => (right.latestSnapshot?.changePct ?? 0) -
            (left.latestSnapshot?.changePct ?? 0),
        )[0] ?? null;
        const laggard = coveredRows.toSorted(
          (left, right) => (left.latestSnapshot?.changePct ?? 0) -
            (right.latestSnapshot?.changePct ?? 0),
        )[0] ?? null;
        const upCount = coveredRows.filter(
          (row) => (row.latestSnapshot?.changePct ?? 0) > 0,
        ).length;
        const downCount = coveredRows.filter(
          (row) => (row.latestSnapshot?.changePct ?? 0) < 0,
        ).length;
        const turnoverByCurrency = new Map<string, number>();
        for (const row of coveredRows) {
          const turnover = row.latestSnapshot?.turnover;
          if (!turnover || !Number.isFinite(turnover)) continue;
          turnoverByCurrency.set(
            row.latestSnapshot.currency,
            (turnoverByCurrency.get(row.latestSnapshot.currency) ?? 0) + turnover,
          );
        }
        const turnover = [...turnoverByCurrency.entries()]
          .toSorted((left, right) => right[1] - left[1])
          .slice(0, 2)
          .map(([currency, value]) => formatCompactCurrency(currency, value))
          .join(" / ") || "—";

        return {
          stage,
          totalCompanies: stageRows.length,
          coveredRows,
          averageChange,
          leader,
          laggard,
          upCount,
          downCount,
          turnover,
        };
      })
      .filter(({ totalCompanies }) => totalCompanies > 0)
      .toSorted((left, right) => {
        const leftChange = left.averageChange ?? Number.NEGATIVE_INFINITY;
        const rightChange = right.averageChange ?? Number.NEGATIVE_INFINITY;
        return rightChange - leftChange || left.stage.order - right.stage.order;
      });
  }, [rowByCompanyId, subnodeCompanyCoverages]);
  const movers = useMemo(
    () =>
      rows
        .filter((row) => row.latestSnapshot)
        .toSorted(
          (left, right) =>
            (right.latestSnapshot?.changePct ?? 0) -
            (left.latestSnapshot?.changePct ?? 0),
        )
        .slice(0, 10),
    [rows],
  );
  const ashareRowsWithMarket = rows.filter(
    (row) => isAshareCompany(row.company) && row.latestSnapshot,
  );
  const positiveRows = rows.filter((row) => (snapshotChange(row) ?? 0) > 0);
  const negativeRows = rows.filter((row) => (snapshotChange(row) ?? 0) < 0);

  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="行情数据">
      <header className="data-page-header">
        <h1>行情数据</h1>
        <div className="data-kpi-strip" aria-label="行情数据状态">
          <article data-state={freshness.status === "missing" ? "empty" : "ready"}>
            <span>状态</span>
            <strong>{freshness.label}</strong>
            <small>
              {freshness.companiesWithMarketData} / {freshness.companyCount} 公司有行情
            </small>
          </article>
          <article data-state={freshness.status === "stale" ? "partial" : "ready"}>
            <span>快照</span>
            <strong>{freshness.marketSnapshotCount} 条</strong>
            <small>{displayDate(freshness.latestTradedAt)}</small>
          </article>
          <article data-state={ashareRowsWithMarket.length ? "ready" : "empty"}>
            <span>A股</span>
            <strong>{ashareRowsWithMarket.length} 家</strong>
            <small>优先覆盖</small>
          </article>
          <article data-state={positiveRows.length ? "ready" : "empty"}>
            <span>涨跌</span>
            <strong>{positiveRows.length} / {negativeRows.length}</strong>
            <small>涨 / 跌</small>
          </article>
        </div>
      </header>

      <div className="market-workbench-grid" aria-label="行情投研区">
        <section className="market-dashboard-section market-sector-panel" aria-label="板块趋势">
          <header>
            <h2>板块趋势</h2>
          </header>
          <div className="workspace-table-scroll">
            <table className="workspace-data-table market-sector-table" aria-label="板块趋势表">
              <thead>
                <tr>
                  <th>板块</th>
                  <th>覆盖</th>
                  <th>平均涨跌</th>
                  <th>上涨 / 下跌</th>
                  <th>领涨</th>
                  <th>领跌</th>
                  <th>成交额</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {stageSummaries.map((summary) => (
                  <tr key={summary.stage.id}>
                    <td>
                      <strong>{summary.stage.name}</strong>
                      <small>{summary.stage.role}</small>
                    </td>
                    <td>
                      {summary.coveredRows.length} / {summary.totalCompanies}
                    </td>
                    <td data-tone={(summary.averageChange ?? 0) >= 0 ? "up" : "down"}>
                      {formatPercent(summary.averageChange)}
                    </td>
                    <td>
                      {summary.upCount} / {summary.downCount}
                    </td>
                    <td>
                      {summary.leader ? (
                        <>
                          <strong>{summary.leader.company.name}</strong>
                          <small>{formatPercent(summary.leader.latestSnapshot?.changePct ?? null)}</small>
                        </>
                      ) : "—"}
                    </td>
                    <td>
                      {summary.laggard ? (
                        <>
                          <strong>{summary.laggard.company.name}</strong>
                          <small>{formatPercent(summary.laggard.latestSnapshot?.changePct ?? null)}</small>
                        </>
                      ) : "—"}
                    </td>
                    <td>{summary.turnover}</td>
                    <td>{latestTimestamp(summary.coveredRows)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="market-dashboard-section market-movers-panel" aria-label="个股异动">
          <header>
            <h2>个股异动</h2>
          </header>
          <div className="workspace-table-scroll">
            <table className="workspace-data-table market-movers-table" aria-label="个股行情榜">
              <thead>
                <tr>
                  <th>公司</th>
                  <th>涨跌幅</th>
                  <th>价格 / 成交</th>
                </tr>
              </thead>
              <tbody>
                {movers.length ? (
                  movers.map(({ company, market, latestSnapshot }) => (
                    <tr key={company.id}>
                      <td>
                        <strong>{company.name}</strong>
                        <small>{getCompanyMarketLabel(company)} · {getCompanyTickerLabel(company)}</small>
                      </td>
                      <td data-tone={(latestSnapshot?.changePct ?? 0) >= 0 ? "up" : "down"}>
                        {displayMetric(market.change)}
                      </td>
                      <td>
                        <strong>{displayMetric(market.price)}</strong>
                        <small>PE {displayMetric(market.pe)} · {displayMetric(market.turnover)}</small>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>暂无行情快照，先到数据设置页刷新。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="market-dashboard-section market-company-panel">
        <header>
          <h2>全部公司行情</h2>
        </header>
        <div className="workspace-table-scroll">
        <table className="workspace-data-table market-data-table" aria-label="行情公司表">
          <thead>
            <tr>
              <th>公司</th>
              <th>市场</th>
              <th>股价</th>
              <th>涨跌幅</th>
              <th>市值</th>
              <th>PE</th>
              <th>PB / PS</th>
              <th>成交额</th>
              <th>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ company, market }) => (
              <tr key={company.id}>
                <td>
                  <strong>{company.name}</strong>
                  <small>{getCompanyTickerLabel(company)}</small>
                </td>
                <td>{getCompanyMarketLabel(company)}</td>
                <td>{displayMetric(market.price)}</td>
                <td>{displayMetric(market.change)}</td>
                <td>{displayMetric(market.marketCap)}</td>
                <td>{displayMetric(market.pe)}</td>
                <td>
                  {displayMetric(market.pb)} / {displayMetric(market.ps)}
                </td>
                <td>{displayMetric(market.turnover)}</td>
                <td>{displayMetric(market.fetchedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </section>
  );
}
