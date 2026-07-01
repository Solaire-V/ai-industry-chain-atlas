import { describe, expect, it } from "vitest";

import {
  presentMarketSnapshot,
  type MarketPresentationSnapshot,
} from "@/lib/atlas/market";

const snapshot = (
  overrides: Partial<MarketPresentationSnapshot> = {},
): MarketPresentationSnapshot => ({
  companyId: "example-company",
  price: 123.456,
  changePct: 1.25,
  currency: "USD",
  tradedAt: "2026-06-30T08:00:00.000Z",
  fetchedAt: "2026-06-30T08:01:00.000Z",
  delayMinutes: 0,
  ttmEps: 4.2,
  ttmPe: 29.394,
  freshnessSource: "live",
  ...overrides,
});

describe("presentMarketSnapshot", () => {
  it("does not present PE for nonpositive earnings or a nonpositive multiple", () => {
    expect(presentMarketSnapshot(snapshot({ ttmEps: 0 })).pe).toBe("N/A");
    expect(presentMarketSnapshot(snapshot({ ttmEps: -1 })).pe).toBe("N/A");
    expect(
      presentMarketSnapshot(snapshot({ ttmPe: -5 }) as MarketPresentationSnapshot)
        .pe,
    ).toBe("N/A");
  });

  it("presents an honest empty state for a null snapshot", () => {
    expect(presentMarketSnapshot(null)).toEqual({
      price: "N/A",
      change: "N/A",
      currency: "N/A",
      pe: "N/A",
      freshness: "暂无行情数据",
      tradedAt: "N/A",
      fetchedAt: "N/A",
    });
  });

  it("labels a zero-delay noncached snapshot as real time", () => {
    expect(presentMarketSnapshot(snapshot()).freshness).toBe("实时");
  });

  it("labels a delayed snapshot with its delay", () => {
    expect(
      presentMarketSnapshot(
        snapshot({ freshnessSource: "delayed", delayMinutes: 15 }),
      ).freshness,
    ).toBe("延迟 15 分钟");
  });

  it("labels a closing snapshot as the most recent close", () => {
    expect(
      presentMarketSnapshot(snapshot({ freshnessSource: "close" })).freshness,
    ).toBe("最近收盘");
  });

  it("gives cached data precedence and includes its localized timestamp", () => {
    const cachedAt = "2026-06-30T09:30:00.000Z";
    expect(
      presentMarketSnapshot(
        snapshot({
          freshnessSource: "close",
          delayMinutes: 15,
          cachedAt,
        }),
      ).freshness,
    ).toBe(`缓存至 ${new Date(cachedAt).toLocaleString("zh-CN")}`);
  });

  it("never leaks NaN or Infinity into display values", () => {
    const presented = presentMarketSnapshot(
      snapshot({
        price: Number.NaN,
        changePct: Number.POSITIVE_INFINITY,
        ttmEps: Number.NaN,
        ttmPe: Number.POSITIVE_INFINITY,
      }),
    );
    expect(presented.price).toBe("N/A");
    expect(presented.change).toBe("N/A");
    expect(presented.pe).toBe("N/A");
    expect(JSON.stringify(presented)).not.toMatch(/NaN|Infinity/);
  });

  it("includes currency with price and preserves positive and negative change signs", () => {
    expect(presentMarketSnapshot(snapshot()).price).toBe("USD 123.46");
    expect(presentMarketSnapshot(snapshot()).change).toBe("+1.25%");
    expect(
      presentMarketSnapshot(snapshot({ changePct: -2.5 })).change,
    ).toBe("-2.5%");
    expect(presentMarketSnapshot(snapshot()).pe).toBe("29.39");
  });
});
