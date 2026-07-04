import { describe, expect, it, vi } from "vitest";

import {
  buildMarketSnapshotRows,
  runMarketSnapshotUpdate,
  sanitizeUpdateErrorMessage,
  type MarketDataProvider,
  type MarketUpdateStore,
} from "@/lib/atlas/market-update";
import type { AtlasCompany } from "@/lib/atlas/schema";

const companies: AtlasCompany[] = [
  {
    id: "nvidia",
    name: "英伟达",
    ticker: "NVDA",
    exchange: "NASDAQ",
    market: "US",
    currency: "USD",
  },
];

const provider: MarketDataProvider = {
  id: "mock-provider",
  async fetchLatest() {
    return [
      {
        companyId: "nvidia",
        price: 120,
        changePct: 2.5,
        currency: "USD",
        tradedAt: "2026-07-03T20:00:00.000Z",
        fetchedAt: "2026-07-03T20:15:00.000Z",
        delayMinutes: 15,
        ttmEps: 4,
        ttmPe: 30,
        freshnessSource: "delayed",
        marketCap: 3_000_000_000_000,
        pb: 40,
        ps: 25,
        turnover: 10_000_000_000,
      },
    ];
  },
};

const createStore = (): MarketUpdateStore => ({
  startUpdateRun: vi.fn(async () => ({ id: "run-1" })),
  resolveCompanyIds: vi.fn(async () => new Map([["nvidia", "company-uuid-nvidia"]])),
  upsertMarketSnapshots: vi.fn(async (rows) => rows.length),
  finishUpdateRun: vi.fn(async () => undefined),
});

describe("market update framework", () => {
  it("converts valid quotes into market_snapshots upsert rows", () => {
    const rows = buildMarketSnapshotRows({
      providerId: "mock-provider",
      companyUuidBySlug: new Map([["nvidia", "company-uuid-nvidia"]]),
      quotes: [
        {
          companyId: "nvidia",
          price: 120,
          changePct: 2.5,
          currency: "USD",
          tradedAt: "2026-07-03T20:00:00.000Z",
          fetchedAt: "2026-07-03T20:15:00.000Z",
          delayMinutes: 15,
          ttmEps: 4,
          ttmPe: 30,
          freshnessSource: "delayed",
          marketCap: 3_000_000_000_000,
          pb: 40,
          ps: 25,
          turnover: 10_000_000_000,
        },
      ],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        company_id: "company-uuid-nvidia",
        provider: "mock-provider",
        price: 120,
        change_pct: 2.5,
        market_cap: 3_000_000_000_000,
        pb: 40,
        ps: 25,
        turnover: 10_000_000_000,
      }),
    ]);
  });

  it("rejects missing quote fields before persistence", () => {
    expect(() =>
      buildMarketSnapshotRows({
        providerId: "mock-provider",
        companyUuidBySlug: new Map([["nvidia", "company-uuid-nvidia"]]),
        quotes: [
          {
            companyId: "nvidia",
            price: Number.NaN,
            changePct: 2.5,
            currency: "USD",
            tradedAt: "2026-07-03T20:00:00.000Z",
            fetchedAt: "2026-07-03T20:15:00.000Z",
            delayMinutes: 15,
            ttmEps: 4,
            ttmPe: 30,
            freshnessSource: "delayed",
          },
        ],
      }),
    ).toThrow(/Invalid market quote/);
  });

  it("writes a successful update run around market snapshot upserts", async () => {
    const store = createStore();

    await expect(
      runMarketSnapshotUpdate({ companies, provider, store }),
    ).resolves.toEqual({
      status: "succeeded",
      provider: "mock-provider",
      rowsRead: 1,
      rowsWritten: 1,
      errorMessage: null,
    });

    expect(store.startUpdateRun).toHaveBeenCalledWith({
      jobName: "market_snapshot_daily",
      provider: "mock-provider",
      startedAt: expect.any(String),
    });
    expect(store.upsertMarketSnapshots).toHaveBeenCalledWith([
      expect.objectContaining({ company_id: "company-uuid-nvidia" }),
    ]);
    expect(store.finishUpdateRun).toHaveBeenCalledWith("run-1", {
      status: "succeeded",
      finishedAt: expect.any(String),
      rowsRead: 1,
      rowsWritten: 1,
      errorMessage: null,
    });
  });

  it("writes a failed update run without leaking secret-like error text", async () => {
    const store = createStore();
    const failingProvider: MarketDataProvider = {
      id: "mock-provider",
      async fetchLatest() {
        throw new Error("provider failed token=secret-token-123");
      },
    };

    await expect(
      runMarketSnapshotUpdate({
        companies,
        provider: failingProvider,
        store,
        secretRedactions: ["secret-token-123"],
      }),
    ).resolves.toMatchObject({
      status: "failed",
      rowsRead: 0,
      rowsWritten: 0,
      errorMessage: "provider failed token=[redacted]",
    });

    expect(store.finishUpdateRun).toHaveBeenCalledWith("run-1", {
      status: "failed",
      finishedAt: expect.any(String),
      rowsRead: 0,
      rowsWritten: 0,
      errorMessage: "provider failed token=[redacted]",
    });
  });

  it("redacts explicit secret values and common key-value token patterns", () => {
    expect(
      sanitizeUpdateErrorMessage(
        "apikey=abc token=def password=ghi value=ok",
        ["ok"],
      ),
    ).toBe("apikey=[redacted] token=[redacted] password=[redacted] value=[redacted]");
  });
});
