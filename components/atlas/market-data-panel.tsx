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
} from "@/lib/atlas/schema";

interface MarketDataPanelProps {
  companies: readonly AtlasCompany[];
  marketSnapshots: readonly AtlasMarketSnapshot[];
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

export function MarketDataPanel({
  companies,
  marketSnapshots,
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

  return (
    <section className="workspace-data-panel workspace-rich-panel" aria-label="行情数据">
      <header>
        <h1>行情数据</h1>
        <p>本地先展示完整公司池和行情字段；真实行情源接入后同一张表直接更新。</p>
      </header>

      <div className="workspace-status-grid" aria-label="行情数据状态">
        <article data-state={freshness.status === "missing" ? "empty" : "ready"}>
          <strong>{freshness.label}</strong>
          <small>
            {freshness.companiesWithMarketData} / {freshness.companyCount} 公司有行情
          </small>
        </article>
        <article data-state={freshness.status === "stale" ? "partial" : "ready"}>
          <strong>{freshness.marketSnapshotCount} 条快照</strong>
          <small>最新交易 {displayDate(freshness.latestTradedAt)}</small>
        </article>
      </div>

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
  );
}
