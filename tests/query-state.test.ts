import { describe, expect, it } from "vitest";

import {
  DEFAULT_ATLAS_QUERY,
  parseAtlasQuery,
  serializeAtlasQuery,
} from "@/lib/atlas/query-state";

describe("parseAtlasQuery", () => {
  it("uses safe defaults for unknown layer and mode values", () => {
    const params = new URLSearchParams("layer=unknown&mode=sideways");

    expect(parseAtlasQuery(params)).toEqual(DEFAULT_ATLAS_QUERY);
  });

  it("roundtrips a selected node, company, and all mode", () => {
    const state = {
      layer: "chips",
      mode: "all",
      node: "gpu-accelerators",
      company: "nvidia",
      search: "HBM",
    } as const;

    expect(parseAtlasQuery(serializeAtlasQuery(state))).toEqual(state);
  });

  it("trims optional fields and caps their lengths", () => {
    const params = new URLSearchParams({
      node: `  ${"n".repeat(110)}  `,
      company: `  ${"企".repeat(110)}  `,
      q: `  ${"搜".repeat(90)}  `,
    });

    expect(parseAtlasQuery(params)).toMatchObject({
      node: "n".repeat(100),
      company: "企".repeat(100),
      search: "搜".repeat(80),
    });
  });

  it("roundtrips Chinese search and company values", () => {
    const parsed = parseAtlasQuery(
      new URLSearchParams("layer=applications&company=寒武纪&q=智能驾驶"),
    );

    expect(parseAtlasQuery(serializeAtlasQuery(parsed))).toEqual({
      layer: "applications",
      mode: "supply",
      node: null,
      company: "寒武纪",
      search: "智能驾驶",
    });
  });

  it("preserves a complete Unicode code point at the search length boundary", () => {
    const search = `${"a".repeat(79)}😀`;
    const state = { ...DEFAULT_ATLAS_QUERY, search };

    const serialized = serializeAtlasQuery(state);

    expect(serialized.get("q")).toBe(search);
    expect(parseAtlasQuery(serialized)).toEqual(state);
  });

  it("removes whitespace exposed by truncation and stays idempotent", () => {
    const state = {
      ...DEFAULT_ATLAS_QUERY,
      search: `${"a".repeat(79)} y`,
    };

    const once = serializeAtlasQuery(state);
    const canonical = parseAtlasQuery(once);
    const twice = serializeAtlasQuery(canonical);

    expect(once.get("q")).toBe("a".repeat(79));
    expect(twice.toString()).toBe(once.toString());
  });

  it("does not mutate its URLSearchParams input and uses the first repeated value", () => {
    const params = new URLSearchParams(
      "layer=chips&layer=platform&node=first&node=second",
    );
    const before = params.toString();

    expect(parseAtlasQuery(params)).toMatchObject({
      layer: "chips",
      node: "first",
    });
    expect(params.toString()).toBe(before);
  });
});

describe("serializeAtlasQuery", () => {
  it("omits empty optional fields and keeps a stable key order", () => {
    const params = serializeAtlasQuery({
      layer: "interconnect",
      mode: "supply",
      node: "  ",
      company: null,
      search: "  ",
    });

    expect(params.toString()).toBe("layer=interconnect&mode=supply");
    expect([...params.keys()]).toEqual(["layer", "mode"]);
  });

  it("normalizes optional values using the parser limits", () => {
    const params = serializeAtlasQuery({
      layer: "materials",
      mode: "value",
      node: ` ${"n".repeat(101)} `,
      company: ` ${"c".repeat(101)} `,
      search: ` ${"q".repeat(81)} `,
    });

    expect([...params.keys()]).toEqual([
      "layer",
      "mode",
      "node",
      "company",
      "q",
    ]);
    expect(params.get("node")).toBe("n".repeat(100));
    expect(params.get("company")).toBe("c".repeat(100));
    expect(params.get("q")).toBe("q".repeat(80));
  });

  it("canonicalizes invalid runtime layer and mode values to defaults", () => {
    const params = serializeAtlasQuery({
      ...DEFAULT_ATLAS_QUERY,
      layer: "invalid-layer",
      mode: "invalid-mode",
    } as unknown as Parameters<typeof serializeAtlasQuery>[0]);

    expect(params.toString()).toBe("layer=interconnect&mode=supply");
  });
});
