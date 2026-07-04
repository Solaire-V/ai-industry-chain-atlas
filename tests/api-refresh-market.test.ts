import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verticalSlice } from "@/content/seed/vertical-slice";

const getSnapshot = vi.fn();

vi.mock("@/lib/atlas/repository", () => ({
  atlasRepository: { getSnapshot },
}));

const originalEnv = { ...process.env };

const refreshUrl = "https://example.test/api/atlas/admin/refresh-market";

const request = (
  url: string,
  {
    method = "POST",
    token,
    headers,
  }: {
    method?: string;
    token?: string;
    headers?: HeadersInit;
  } = {},
) =>
  new Request(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

describe("/api/atlas/admin/refresh-market", () => {
  beforeEach(() => {
    vi.resetModules();
    getSnapshot.mockReset();
    process.env = { ...originalEnv };
    delete process.env.ATLAS_CRON_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.MARKET_DATA_PROVIDER;
    delete process.env.FUYAO_TOKEN;
    delete process.env.HITHINK_FUYAO_API_KEY;
    delete process.env.API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 503 before reading data when refresh secret is not configured", async () => {
    const { POST } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await POST(request(refreshUrl, { token: "client-token" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "refresh_secret_not_configured",
        message: "Market refresh secret is not configured.",
      },
    });
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong bearer tokens without leaking the configured secret", async () => {
    process.env.ATLAS_CRON_SECRET = "server-refresh-secret";
    const { POST } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await POST(request(refreshUrl, { token: "wrong-token" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "unauthorized",
        message: "Unauthorized market refresh request.",
      },
    });
    expect(JSON.stringify(body)).not.toContain("server-refresh-secret");
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it("supports authenticated dry-run requests without writing snapshots", async () => {
    process.env.ATLAS_CRON_SECRET = "server-refresh-secret";
    process.env.MARKET_DATA_PROVIDER = "disabled";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { POST } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await POST(
      request(`${refreshUrl}?dryRun=1`, { token: "server-refresh-secret" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "dry_run",
      code: "dry_run",
      provider: "disabled",
      trigger: "manual",
      wouldWrite: false,
      companyCount: verticalSlice.companies.length,
    });
    expect(JSON.stringify(body)).not.toContain("server-refresh-secret");
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("supports Vercel Cron GET requests and reports the triggering schedule", async () => {
    process.env.CRON_SECRET = "server-refresh-secret";
    process.env.MARKET_DATA_PROVIDER = "disabled";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { GET } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await GET(
      request(refreshUrl, {
        method: "GET",
        token: "server-refresh-secret",
        headers: {
          "user-agent": "vercel-cron/1.0",
          "x-vercel-cron-schedule": "0 20 * * *",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "skipped",
      code: "provider_disabled",
      provider: "disabled",
      trigger: "vercel-cron",
      cronSchedule: "0 20 * * *",
      companyCount: verticalSlice.companies.length,
    });
  });

  it("keeps CRON_SECRET valid when ATLAS_CRON_SECRET is also configured", async () => {
    process.env.CRON_SECRET = "vercel-refresh-secret";
    process.env.ATLAS_CRON_SECRET = "manual-refresh-secret";
    process.env.MARKET_DATA_PROVIDER = "disabled";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { GET } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await GET(
      request(refreshUrl, {
        method: "GET",
        token: "vercel-refresh-secret",
        headers: {
          "user-agent": "vercel-cron/1.0",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "skipped",
      code: "provider_disabled",
      provider: "disabled",
      trigger: "vercel-cron",
      companyCount: verticalSlice.companies.length,
    });
  });

  it("returns a clear not-implemented response when a real provider is selected before integration", async () => {
    process.env.ATLAS_CRON_SECRET = "server-refresh-secret";
    process.env.MARKET_DATA_PROVIDER = "eodhd";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { POST } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await POST(
      request(refreshUrl, { token: "server-refresh-secret" }),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body).toMatchObject({
      status: "skipped",
      code: "provider_not_implemented",
      provider: "eodhd",
      companyCount: verticalSlice.companies.length,
    });
    expect(JSON.stringify(body)).not.toContain("server-refresh-secret");
  });

  it("recognizes the HiThink Fuyao provider and requires its API key before live refresh", async () => {
    process.env.ATLAS_CRON_SECRET = "server-refresh-secret";
    process.env.MARKET_DATA_PROVIDER = "hithink-fuyao";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { POST } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await POST(
      request(refreshUrl, { token: "server-refresh-secret" }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "skipped",
      code: "provider_not_configured",
      provider: "hithink-fuyao",
      companyCount: verticalSlice.companies.length,
      missingEnv: ["HITHINK_FUYAO_API_KEY"],
    });
    expect(JSON.stringify(body)).not.toContain("server-refresh-secret");
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("returns 405 for methods that cannot trigger a refresh", async () => {
    const { PUT } = await import("@/app/api/atlas/admin/refresh-market/route");

    const response = await PUT(request(refreshUrl, { method: "PUT" }));
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, POST");
    expect(body).toEqual({
      error: {
        code: "method_not_allowed",
        message: "Use GET for Vercel Cron or POST for manual refresh.",
      },
    });
  });
});
