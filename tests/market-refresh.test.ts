import { describe, expect, it, vi } from "vitest";

import { handleMarketRefresh } from "@/lib/atlas/market-refresh";
import type {
  MarketDataProvider,
  MarketUpdateStore,
} from "@/lib/atlas/market-update";
import type { AtlasCompany, AtlasSnapshot } from "@/lib/atlas/schema";

const cnCompany: AtlasCompany = {
  id: "zhongji-innolight",
  name: "中际旭创",
  ticker: "300308.SZ",
  exchange: "SZSE",
  market: "CN",
  currency: "CNY",
};

const snapshot: AtlasSnapshot = {
  companies: [cnCompany],
  nodes: [],
  companyNodeRoles: [],
  subnodeCompanyCoverages: [],
  industryEdges: [],
  supplyRelations: [],
  marketSnapshots: [],
  sources: [],
};

const request = (token = "refresh-secret") =>
  new Request("https://example.test/api/atlas/admin/refresh-market", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });

const repository = {
  getSnapshot: vi.fn(async () => snapshot),
};

const provider: MarketDataProvider = {
  id: "hithink-fuyao",
  fetchLatest: vi.fn(),
};

const store: MarketUpdateStore = {
  startUpdateRun: vi.fn(),
  resolveCompanyIds: vi.fn(),
  upsertMarketSnapshots: vi.fn(),
  finishUpdateRun: vi.fn(),
};

describe("market refresh orchestration", () => {
  it("requires Supabase write configuration before running a live Fuyao refresh", async () => {
    const response = await handleMarketRefresh({
      request: request(),
      repository,
      env: {
        ATLAS_CRON_SECRET: "refresh-secret",
        MARKET_DATA_PROVIDER: "hithink-fuyao",
        HITHINK_FUYAO_API_KEY: "fuyao-secret",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "skipped",
      code: "market_update_store_not_configured",
      provider: "hithink-fuyao",
      missingEnv: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      wouldWrite: false,
      companyCount: 1,
    });
    expect(JSON.stringify(body)).not.toContain("fuyao-secret");
  });

  it("runs the Fuyao provider through the shared market snapshot update pipeline", async () => {
    const createProvider = vi.fn(() => provider);
    const createSupabaseClient = vi.fn(() => ({ from: vi.fn() }));
    const createStore = vi.fn(() => store);
    const runMarketUpdate = vi.fn(async () => ({
      status: "succeeded" as const,
      provider: "hithink-fuyao",
      rowsRead: 1,
      rowsWritten: 1,
      errorMessage: null,
    }));

    const response = await handleMarketRefresh({
      request: request(),
      repository,
      env: {
        ATLAS_CRON_SECRET: "refresh-secret",
        MARKET_DATA_PROVIDER: "hithink-fuyao",
        HITHINK_FUYAO_API_KEY: "fuyao-secret",
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      },
      dependencies: {
        createHithinkFuyaoMarketDataProvider: createProvider,
        createSupabaseMarketUpdateClient: createSupabaseClient,
        createMarketUpdateStore: createStore,
        runMarketUpdate,
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "succeeded",
      code: "market_update_succeeded",
      provider: "hithink-fuyao",
      rowsRead: 1,
      rowsWritten: 1,
      companyCount: 1,
    });
    expect(createProvider).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "fuyao-secret" }),
    );
    expect(createSupabaseClient).toHaveBeenCalledWith(
      "https://supabase.example",
      "service-role-secret",
    );
    expect(createStore).toHaveBeenCalledWith(createSupabaseClient.mock.results[0]?.value);
    expect(runMarketUpdate).toHaveBeenCalledWith({
      companies: [cnCompany],
      provider,
      store,
      secretRedactions: ["fuyao-secret"],
    });
    expect(JSON.stringify(body)).not.toContain("fuyao-secret");
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
  });

  it("redacts provider secrets when live refresh orchestration fails before update run starts", async () => {
    const runMarketUpdate = vi.fn(async () => {
      throw new Error("provider rejected api key fuyao-secret");
    });

    const response = await handleMarketRefresh({
      request: request(),
      repository,
      env: {
        ATLAS_CRON_SECRET: "refresh-secret",
        MARKET_DATA_PROVIDER: "fuyao",
        HITHINK_FUYAO_API_KEY: "fuyao-secret",
        SUPABASE_URL: "https://supabase.example",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
      },
      dependencies: {
        createHithinkFuyaoMarketDataProvider: vi.fn(() => provider),
        createSupabaseMarketUpdateClient: vi.fn(() => ({ from: vi.fn() })),
        createMarketUpdateStore: vi.fn(() => store),
        runMarketUpdate,
      },
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      status: "failed",
      code: "market_update_failed",
      provider: "hithink-fuyao",
      errorMessage: "provider rejected api key [redacted]",
    });
    expect(JSON.stringify(body)).not.toContain("fuyao-secret");
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
  });
});
