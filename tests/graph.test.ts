import { describe, expect, it } from "vitest";

import {
  filterEdgesByMode,
  getNeighborhood,
  layoutByRank,
} from "@/lib/atlas/graph";
import type { AtlasIndustryEdge } from "@/lib/atlas/schema";

const edge = (
  id: string,
  from: string,
  to: string,
  type: AtlasIndustryEdge["type"] = "supply",
): AtlasIndustryEdge => ({ id, from, to, type });

describe("getNeighborhood", () => {
  it("returns the selected node and its one-hop incoming and outgoing neighbors", () => {
    const edges = [edge("ab", "a", "b"), edge("bc", "b", "c")];

    expect(getNeighborhood("b", edges)).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("filterEdgesByMode", () => {
  it("filters supply, value, and all views while preserving order", () => {
    const edges = [
      edge("s1", "a", "b", "supply"),
      edge("i1", "b", "c", "integrate"),
      edge("d1", "c", "d", "deploy"),
      edge("s2", "d", "e", "supply"),
    ] as const;

    expect(filterEdgesByMode(edges, "supply").map(({ id }) => id)).toEqual([
      "s1",
      "s2",
    ]);
    expect(filterEdgesByMode(edges, "value").map(({ id }) => id)).toEqual([
      "i1",
      "d1",
    ]);
    expect(filterEdgesByMode(edges, "all").map(({ id }) => id)).toEqual([
      "s1",
      "i1",
      "d1",
      "s2",
    ]);
  });

  it("does not mutate the input or return the input array for all mode", () => {
    const edges = Object.freeze([
      Object.freeze(edge("d1", "a", "b", "deploy")),
      Object.freeze(edge("s1", "b", "c", "supply")),
    ]);
    const before = structuredClone(edges);

    const result = filterEdgesByMode(edges, "all");

    expect(edges).toEqual(before);
    expect(result).toEqual(edges);
    expect(result).not.toBe(edges);
  });
});

describe("layoutByRank", () => {
  it("places an acyclic chain one rank apart", () => {
    const result = layoutByRank(
      ["a", "b", "c"],
      [edge("ab", "a", "b"), edge("bc", "b", "c")],
    );

    expect(result).toEqual([
      { id: "a", x: 0, y: 0, rank: 0 },
      { id: "b", x: 240, y: 0, rank: 1 },
      { id: "c", x: 480, y: 0, rank: 2 },
    ]);
  });

  it("assigns stable sibling y positions in node input order", () => {
    const result = layoutByRank(
      ["root", "second", "first"],
      [edge("r1", "root", "first"), edge("r2", "root", "second")],
    );

    expect(result).toEqual([
      { id: "root", x: 0, y: 0, rank: 0 },
      { id: "second", x: 240, y: 0, rank: 1 },
      { id: "first", x: 240, y: 96, rank: 1 },
    ]);
  });

  it("places isolated rank-zero nodes after connected sources deterministically", () => {
    const result = layoutByRank(
      ["isolated-first", "source", "child", "isolated-last"],
      [edge("sc", "source", "child")],
    );

    expect(result).toEqual([
      { id: "isolated-first", x: 0, y: 96, rank: 0 },
      { id: "source", x: 0, y: 0, rank: 0 },
      { id: "child", x: 240, y: 0, rank: 1 },
      { id: "isolated-last", x: 0, y: 192, rank: 0 },
    ]);
  });

  it("ignores edges with endpoints absent from nodeIds", () => {
    const result = layoutByRank(
      ["a", "b"],
      [edge("outside-in", "missing", "a"), edge("outside-out", "b", "gone")],
    );

    expect(result).toEqual([
      { id: "a", x: 0, y: 0, rank: 0 },
      { id: "b", x: 0, y: 96, rank: 0 },
    ]);
  });

  it("collapses a source cycle to finite stable rank-zero coordinates", () => {
    const nodeIds = ["a", "b"] as const;
    const edges = [edge("ab", "a", "b"), edge("ba", "b", "a")];

    expect(layoutByRank(nodeIds, edges)).toEqual([
      { id: "a", x: 0, y: 0, rank: 0 },
      { id: "b", x: 0, y: 96, rank: 0 },
    ]);
    expect(layoutByRank(nodeIds, edges)).toEqual(layoutByRank(nodeIds, edges));
    expect(
      layoutByRank(nodeIds, edges).every(({ x, y }) =>
        Number.isFinite(x) && Number.isFinite(y),
      ),
    ).toBe(true);
  });

  it("places a cycle at the earliest rank after an acyclic predecessor", () => {
    const result = layoutByRank(
      ["source", "a", "b", "tail"],
      [
        edge("sa", "source", "a"),
        edge("ab", "a", "b"),
        edge("ba", "b", "a"),
        edge("bt", "b", "tail"),
      ],
    );

    expect(result.map(({ id, rank }) => [id, rank])).toEqual([
      ["source", 0],
      ["a", 1],
      ["b", 1],
      ["tail", 2],
    ]);
  });

  it("preserves node and edge inputs", () => {
    const nodeIds = Object.freeze(["a", "b", "c"]);
    const edges = Object.freeze([
      Object.freeze(edge("ab", "a", "b")),
      Object.freeze(edge("bc", "b", "c")),
    ]);
    const nodesBefore = structuredClone(nodeIds);
    const edgesBefore = structuredClone(edges);

    layoutByRank(nodeIds, edges);

    expect(nodeIds).toEqual(nodesBefore);
    expect(edges).toEqual(edgesBefore);
  });
});
