import { describe, expect, it } from "vitest";

import {
  buildAtlasDataFreshness,
  selectLatestMarketSnapshots,
} from "@/lib/atlas/data-freshness";
import type { AtlasMarketSnapshot } from "@/lib/atlas/schema";

const snapshot = (
  companyId: string,
  tradedAt: string,
  fetchedAt = tradedAt,
): AtlasMarketSnapshot => ({
  companyId,
  price: 10,
  changePct: 1,
  currency: "USD",
  tradedAt,
  fetchedAt,
  delayMinutes: 15,
  ttmEps: 1,
  ttmPe: 10,
  freshnessSource: "delayed",
});

describe("atlas data freshness", () => {
  it("selects the latest market snapshot per company by tradedAt", () => {
    const latest = selectLatestMarketSnapshots([
      snapshot("nvidia", "2026-07-01T00:00:00.000Z"),
      snapshot("nvidia", "2026-07-03T00:00:00.000Z"),
      snapshot("broadcom", "2026-07-02T00:00:00.000Z"),
    ]);

    expect(latest.get("nvidia")?.tradedAt).toBe("2026-07-03T00:00:00.000Z");
    expect(latest.get("broadcom")?.tradedAt).toBe("2026-07-02T00:00:00.000Z");
  });

  it("returns a stable missing state when no market data exists", () => {
    expect(
      buildAtlasDataFreshness({
        companies: [
          {
            id: "nvidia",
            name: "英伟达",
            ticker: "NVDA",
            exchange: "NASDAQ",
            market: "US",
            currency: "USD",
          },
        ],
        marketSnapshots: [],
      }),
    ).toMatchObject({
      status: "missing",
      label: "行情未接入",
      companyCount: 1,
      companiesWithMarketData: 0,
      companiesMissingMarketData: 1,
      latestTradedAt: null,
      latestFetchedAt: null,
    });
  });

  it("distinguishes fresh and stale market data using the latest fetched timestamp", () => {
    const companies = [
      {
        id: "nvidia",
        name: "英伟达",
        ticker: "NVDA",
        exchange: "NASDAQ",
        market: "US",
        currency: "USD",
      },
    ] as const;

    expect(
      buildAtlasDataFreshness(
        {
          companies,
          marketSnapshots: [
            snapshot(
              "nvidia",
              "2026-07-03T00:00:00.000Z",
              "2026-07-03T12:00:00.000Z",
            ),
          ],
        },
        new Date("2026-07-04T00:00:00.000Z"),
      ).status,
    ).toBe("fresh");

    expect(
      buildAtlasDataFreshness(
        {
          companies,
          marketSnapshots: [
            snapshot(
              "nvidia",
              "2026-07-01T00:00:00.000Z",
              "2026-07-01T12:00:00.000Z",
            ),
          ],
        },
        new Date("2026-07-04T00:00:00.000Z"),
      ).status,
    ).toBe("stale");
  });
});
