import { beforeEach, describe, expect, it, vi } from "vitest";

import { verticalSlice } from "@/content/seed/vertical-slice";

const getSnapshot = vi.fn();

vi.mock("@/lib/atlas/repository", () => ({
  atlasRepository: { getSnapshot },
}));

describe("GET /api/atlas/status", () => {
  beforeEach(() => {
    getSnapshot.mockReset();
  });

  it("returns a read-only freshness summary with public cache headers and no secrets", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { GET } = await import("@/app/api/atlas/status/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(body).toMatchObject({
      status: "missing",
      label: "行情未接入",
      companyCount: verticalSlice.companies.length,
      companiesWithMarketData: 0,
      companiesMissingMarketData: verticalSlice.companies.length,
    });
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
  });
});
