import type { MarketDataProvider, MarketQuote } from "@/lib/atlas/market-update";
import type { AtlasCompany } from "@/lib/atlas/schema";

export interface HithinkFuyaoProviderConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

interface FuyaoEnvelope {
  code: number;
  message?: string;
  request_id?: string;
  data?: {
    timestamp?: number | null;
    total?: number;
    item?: FuyaoSnapshotItem[];
  } | null;
}

export interface FuyaoSnapshotItem {
  thscode: string;
  ticker?: string;
  last_price: number;
  price_change?: number;
  price_change_ratio_pct: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  prev_price?: number;
  volume?: number;
  turnover?: number;
}

export interface MapFuyaoSnapshotItemInput {
  company: AtlasCompany;
  item: FuyaoSnapshotItem;
  dataTimestamp?: number | null;
  fetchedAt: Date;
}

const DEFAULT_BASE_URL = "https://fuyao.aicubes.cn";
const HITHINK_FUYAO_PROVIDER_ID = "hithink-fuyao";
const DEFAULT_DELAY_MINUTES = 15;
const CHUNK_SIZE = 50;

const exchangeSuffixByExchange: Record<string, "SH" | "SZ" | "BJ" | undefined> = {
  SSE: "SH",
  SHSE: "SH",
  SZSE: "SZ",
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const chunk = <T>(values: readonly T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

class FuyaoApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(
      `Fuyao API error code=${code} request_id=${requestId ?? "unknown"} message=${message}`,
    );
  }
}

const isUnknownThscodeError = (error: unknown) =>
  error instanceof FuyaoApiError &&
  error.code === 1002 &&
  /unknown thscode/i.test(error.message);

export const toFuyaoThscode = (company: AtlasCompany) => {
  if (company.market !== "CN") return null;

  const ticker = company.ticker.trim().toUpperCase();
  if (/^\d{6}\.(SH|SZ)$/.test(ticker)) return ticker;

  if (/^\d{6}$/.test(ticker)) {
    const suffix = exchangeSuffixByExchange[company.exchange.toUpperCase()];
    return suffix ? `${ticker}.${suffix}` : null;
  }

  return null;
};

export const mapFuyaoSnapshotItemToQuote = ({
  company,
  item,
  dataTimestamp,
  fetchedAt,
}: MapFuyaoSnapshotItemInput): MarketQuote => {
  if (!isFiniteNumber(item.last_price)) {
    throw new Error(`Fuyao snapshot missing last_price for ${item.thscode}`);
  }
  if (!isFiniteNumber(item.price_change_ratio_pct)) {
    throw new Error(`Fuyao snapshot missing price_change_ratio_pct for ${item.thscode}`);
  }

  const tradedAt = dataTimestamp
    ? new Date(dataTimestamp)
    : new Date(fetchedAt.getTime() - DEFAULT_DELAY_MINUTES * 60_000);
  const delayMinutes = Math.max(
    1,
    Math.round((fetchedAt.getTime() - tradedAt.getTime()) / 60_000),
  );

  return {
    companyId: company.id,
    price: item.last_price,
    changePct: item.price_change_ratio_pct,
    currency: company.currency,
    tradedAt: tradedAt.toISOString(),
    fetchedAt: fetchedAt.toISOString(),
    delayMinutes,
    ttmEps: null,
    ttmPe: null,
    freshnessSource: "delayed",
    turnover: isFiniteNumber(item.turnover) ? item.turnover : undefined,
  };
};

const parseFuyaoEnvelope = async (response: Response): Promise<FuyaoEnvelope> => {
  if (!response.ok) {
    throw new Error(`Fuyao HTTP error status=${response.status}`);
  }

  const payload = (await response.json()) as FuyaoEnvelope;
  if (payload.code !== 0) {
    throw new FuyaoApiError(
      payload.code,
      payload.message ?? "",
      payload.request_id,
    );
  }
  return payload;
};

export const createHithinkFuyaoMarketDataProvider = ({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  fetch: fetchFn = fetch,
  now = () => new Date(),
}: HithinkFuyaoProviderConfig): MarketDataProvider => ({
  id: HITHINK_FUYAO_PROVIDER_ID,
  async fetchLatest(companies) {
    const companyByThscode = new Map<string, AtlasCompany>();
    for (const company of companies) {
      const thscode = toFuyaoThscode(company);
      if (thscode) companyByThscode.set(thscode, company);
    }

    const thscodes = [...companyByThscode.keys()];
    if (thscodes.length === 0) return [];

    const quotes: MarketQuote[] = [];
    const fetchChunk = async (thscodeChunk: readonly string[]): Promise<void> => {
      const url = new URL("/api/a-share/prices/snapshot", baseUrl);
      url.searchParams.set("thscodes", thscodeChunk.join(","));
      let payload: FuyaoEnvelope;
      try {
        const response = await fetchFn(url, {
          headers: { "X-api-key": apiKey },
        });
        payload = await parseFuyaoEnvelope(response);
      } catch (error) {
        if (!isUnknownThscodeError(error)) throw error;
        if (thscodeChunk.length === 1) return;
        for (const smallerChunk of chunk(thscodeChunk, 1)) {
          await fetchChunk(smallerChunk);
        }
        return;
      }

      const fetchedAt = now();

      for (const item of payload.data?.item ?? []) {
        const company = companyByThscode.get(item.thscode.toUpperCase());
        if (!company) continue;
        if (
          !isFiniteNumber(item.last_price) ||
          !isFiniteNumber(item.price_change_ratio_pct)
        ) {
          continue;
        }
        quotes.push(
          mapFuyaoSnapshotItemToQuote({
            company,
            item,
            dataTimestamp: payload.data?.timestamp,
            fetchedAt,
          }),
        );
      }
    };

    for (const thscodeChunk of chunk(thscodes, CHUNK_SIZE)) {
      await fetchChunk(thscodeChunk);
    }

    return quotes;
  },
});
