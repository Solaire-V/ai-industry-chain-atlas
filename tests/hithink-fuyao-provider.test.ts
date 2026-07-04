import { describe, expect, it, vi } from "vitest";

import {
  createHithinkFuyaoMarketDataProvider,
  mapFuyaoSnapshotItemToQuote,
  toFuyaoThscode,
} from "@/lib/atlas/providers/hithink-fuyao";
import type { AtlasCompany } from "@/lib/atlas/schema";

const cnCompany: AtlasCompany = {
  id: "zhongji-innolight",
  name: "中际旭创",
  ticker: "300308.SZ",
  exchange: "SZSE",
  market: "CN",
  currency: "CNY",
};

const usCompany: AtlasCompany = {
  id: "nvidia",
  name: "英伟达",
  ticker: "NVDA",
  exchange: "NASDAQ",
  market: "US",
  currency: "USD",
};

describe("HiThink Fuyao A-share provider", () => {
  it("maps A-share company tickers to Fuyao thscode format", () => {
    expect(toFuyaoThscode(cnCompany)).toBe("300308.SZ");
    expect(
      toFuyaoThscode({
        ...cnCompany,
        ticker: "688981",
        exchange: "SSE",
      }),
    ).toBe("688981.SH");
    expect(toFuyaoThscode(usCompany)).toBeNull();
  });

  it("maps Fuyao snapshot items into market quotes without changing percentage units", () => {
    const quote = mapFuyaoSnapshotItemToQuote({
      company: cnCompany,
      item: {
        thscode: "300308.SZ",
        ticker: "300308",
        last_price: 138.25,
        price_change: 4.12,
        price_change_ratio_pct: 3.0712,
        volume: 33192000,
        turnover: 4589000000,
      },
      dataTimestamp: 1783065600000,
      fetchedAt: new Date("2026-07-04T08:20:00.000Z"),
    });

    expect(quote).toEqual({
      companyId: "zhongji-innolight",
      price: 138.25,
      changePct: 3.0712,
      currency: "CNY",
      tradedAt: "2026-07-03T08:00:00.000Z",
      fetchedAt: "2026-07-04T08:20:00.000Z",
      delayMinutes: expect.any(Number),
      ttmEps: null,
      ttmPe: null,
      freshnessSource: "delayed",
      turnover: 4589000000,
    });
  });

  it("fetches only A-share companies and sends the API key as an X-api-key header", async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual({ "X-api-key": "fuyao-secret" });
      return new Response(
        JSON.stringify({
          code: 0,
          message: "success",
          request_id: "request-1",
          data: {
            timestamp: 1783065600000,
            total: 1,
            item: [
              {
                thscode: "300308.SZ",
                ticker: "300308",
                last_price: 138.25,
                price_change: 4.12,
                price_change_ratio_pct: 3.0712,
                turnover: 4589000000,
              },
            ],
          },
        }),
        { status: 200 },
      );
    });
    const provider = createHithinkFuyaoMarketDataProvider({
      apiKey: "fuyao-secret",
      fetch: fetchFn,
      now: () => new Date("2026-07-04T08:20:00.000Z"),
    });

    const quotes = await provider.fetchLatest([cnCompany, usCompany]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0]?.[0])).toContain(
      "/api/a-share/prices/snapshot?thscodes=300308.SZ",
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      companyId: "zhongji-innolight",
      price: 138.25,
      changePct: 3.0712,
      turnover: 4589000000,
    });
  });

  it("surfaces Fuyao business errors without leaking the API key", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          code: 2001,
          message: "invalid api key",
          request_id: "request-2",
          data: null,
        }),
        { status: 200 },
      ),
    );
    const provider = createHithinkFuyaoMarketDataProvider({
      apiKey: "fuyao-secret",
      fetch: fetchFn,
    });

    await expect(provider.fetchLatest([cnCompany])).rejects.toThrow(
      /Fuyao API error code=2001/,
    );
    await expect(provider.fetchLatest([cnCompany])).rejects.not.toThrow(
      /fuyao-secret/,
    );
  });
});
