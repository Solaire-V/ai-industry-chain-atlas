import type { AtlasMarketSnapshot } from "@/lib/atlas/schema";

export type MarketFreshnessSource = "live" | "delayed" | "close" | "cached";

export type MarketPresentationSnapshot = AtlasMarketSnapshot & {
  freshnessSource?: MarketFreshnessSource;
  cachedAt?: string | null;
  error?: string | boolean | null;
};

export interface PresentedMarketSnapshot {
  price: string;
  change: string;
  currency: string;
  pe: string;
  freshness: string;
  tradedAt: string;
  fetchedAt: string;
}

const finite = (value: number | null): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);

const formatTimestamp = (value: string | null | undefined, locale: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString(locale);
};

export const presentMarketSnapshot = (
  snapshot: MarketPresentationSnapshot | null,
  locale = "zh-CN",
): PresentedMarketSnapshot => {
  if (!snapshot) {
    return {
      price: "N/A",
      change: "N/A",
      currency: "N/A",
      pe: "N/A",
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
  const change = finite(snapshot.changePct)
    ? `${snapshot.changePct > 0 ? "+" : ""}${formatNumber(snapshot.changePct, locale)}%`
    : "N/A";
  const pe = finite(snapshot.ttmEps) && snapshot.ttmEps > 0 &&
      finite(snapshot.ttmPe) && snapshot.ttmPe > 0
    ? formatNumber(snapshot.ttmPe, locale)
    : "N/A";

  const cachedTimestamp = snapshot.cachedAt ??
    (snapshot.freshnessSource === "cached" || snapshot.error
      ? snapshot.fetchedAt
      : null);
  let freshness: string;
  if (cachedTimestamp) {
    const formatted = formatTimestamp(cachedTimestamp, locale);
    freshness = formatted === "N/A" ? "缓存数据" : `缓存至 ${formatted}`;
  } else if (snapshot.freshnessSource === "close") {
    freshness = "最近收盘";
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
    freshness,
    tradedAt: formatTimestamp(snapshot.tradedAt, locale),
    fetchedAt: formatTimestamp(snapshot.fetchedAt, locale),
  };
};
