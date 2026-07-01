import { beforeEach, describe, expect, it, vi } from "vitest";

import { verticalSlice } from "@/content/seed/vertical-slice";
import { atlasSnapshotSchema } from "@/lib/atlas/schema";

const getSnapshot = vi.fn();

vi.mock("@/lib/atlas/repository", () => ({
  fixtureAtlasRepository: { getSnapshot },
}));

describe("GET /api/atlas", () => {
  beforeEach(() => {
    getSnapshot.mockReset();
  });

  it("returns a parsed layer snapshot with public cache headers and no secrets", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    getSnapshot.mockResolvedValueOnce(verticalSlice);
    const { GET } = await import("@/app/api/atlas/route");

    const response = await GET(
      new Request("https://example.test/api/atlas?layer=interconnect"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(atlasSnapshotSchema.parse(body)).toEqual(body);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    const visibleLayers = new Set(
      body.nodes.map(({ layer }: { layer: string }) => layer),
    );
    expect(visibleLayers).toContain("interconnect");
    expect(visibleLayers.size).toBeGreaterThan(1);
    expect(body.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "cpo" })]),
    );
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
  });

  it("returns a structured 400 for invalid layers", async () => {
    const { GET } = await import("@/app/api/atlas/route");

    const response = await GET(
      new Request("https://example.test/api/atlas?layer=bad"),
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "invalid_layer",
        message: "Unknown atlas layer: bad",
      },
    });
    expect(response.status).toBe(400);
    expect(getSnapshot).not.toHaveBeenCalled();
  });
});
