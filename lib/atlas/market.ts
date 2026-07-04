import type { AtlasMarketSnapshot } from "@/lib/atlas/schema";

export interface PresentedMarketSnapshot {
  price: string;
  change: string;
  currency: string;
  pe: string;
  marketCap: string;
  pb: string;
  ps: string;
  turnover: string;
  freshness: string;
  tradedAt: string;
  fetchedAt: string;
}

const finite = (value: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

const formatCompactNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    notation: "compact",
  }).format(value);

const formatTimestamp = (value: string | null | undefined, locale: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString(locale);
};

export const presentMarketSnapshot = (
  snapshot: AtlasMarketSnapshot | null,
  locale = "zh-CN",
): PresentedMarketSnapshot => {
  if (!snapshot) {
    return {
      price: "N/A",
      change: "N/A",
      currency: "N/A",
      pe: "N/A",
      marketCap: "N/A",
      pb: "N/A",
      ps: "N/A",
      turnover: "N/A",
      freshness: "暂无行情数据",
      tradedAt: "N/A",
      fetchedAt: "N/A",
    };
  }

  const currency = /^[A-Z]{3}$/.test(snapshot.currency)
    ? snapshot.currency
    : "N/A";
  const price = finite(snapshot.price) && currency !== "N/A"
    ? `${currency} ${formatNumber(snapshot.price, locale)}`
    : "N/A";
  let change = "N/A";
  if (finite(snapshot.changePct)) {
    if (Object.is(snapshot.changePct, -0) || snapshot.changePct === 0) {
      change = "0%";
    } else if (Math.abs(snapshot.changePct) < 0.01) {
      change = `${snapshot.changePct > 0 ? "+" : "-"}<0.01%`;
    } else {
      change = `${snapshot.changePct > 0 ? "+" : ""}${formatNumber(snapshot.changePct, locale)}%`;
    }
  }
  const pe = finite(snapshot.ttmEps) && snapshot.ttmEps > 0 &&
      finite(snapshot.ttmPe) && snapshot.ttmPe > 0
    ? formatNumber(snapshot.ttmPe, locale)
    : "N/A";
  const marketCapValue = snapshot.marketCap ?? null;
  const pbValue = snapshot.pb ?? null;
  const psValue = snapshot.ps ?? null;
  const turnoverValue = snapshot.turnover ?? null;
  const marketCap = finite(marketCapValue) && currency !== "N/A"
    ? `${currency} ${formatCompactNumber(marketCapValue, locale)}`
    : "N/A";
  const pb = finite(pbValue)
    ? formatNumber(pbValue, locale)
    : "N/A";
  const ps = finite(psValue)
    ? formatNumber(psValue, locale)
    : "N/A";
  const turnover = finite(turnoverValue) && currency !== "N/A"
    ? `${currency} ${formatCompactNumber(turnoverValue, locale)}`
    : "N/A";

  const cachedTimestamp = snapshot.cachedAt ??
    (snapshot.error ? snapshot.fetchedAt : null);
  let freshness: string;
  if (cachedTimestamp) {
    const formatted = formatTimestamp(cachedTimestamp, locale);
    freshness = formatted === "N/A" ? "缓存数据" : `缓存至 ${formatted}`;
  } else if (snapshot.freshnessSource === "close") {
    freshness = "最近收盘";
  } else if (snapshot.freshnessSource === "cached") {
    freshness = `缓存至 ${formatTimestamp(snapshot.fetchedAt, locale)}`;
  } else if (snapshot.freshnessSource === "delayed") {
    freshness = `延迟 ${snapshot.delayMinutes} 分钟`;
  } else if (snapshot.freshnessSource === "live") {
    freshness = "实时";
  } else if (snapshot.delayMinutes > 0) {
    freshness = `延迟 ${snapshot.delayMinutes} 分钟`;
  } else {
    freshness = "实时";
  }

  return {
    price,
    change,
    currency,
    pe,
    marketCap,
    pb,
    ps,
    turnover,
    freshness,
    tradedAt: formatTimestamp(snapshot.tradedAt, locale),
    fetchedAt: formatTimestamp(snapshot.fetchedAt, locale),
  };
};
