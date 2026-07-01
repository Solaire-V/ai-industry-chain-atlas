import { describe, expect, it } from "vitest";

import {
  RELATIONSHIP_MODES,
  filterEdgesByMode,
  getNeighborhood,
  isRelationshipMode,
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
  it("exposes one runtime source of truth for valid relationship modes", () => {
    expect(RELATIONSHIP_MODES).toEqual(["supply", "value", "all"]);
    expect(RELATIONSHIP_MODES.every(isRelationshipMode)).toBe(true);
    expect(isRelationshipMode("invalid")).toBe(false);
    expect(isRelationshipMode(null)).toBe(false);
  });

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

  it("returns one record per first node occurrence", () => {
    const result = layoutByRank(
      ["a", "b", "a", "c", "b"],
      [edge("ab", "a", "b"), edge("bc", "b", "c")],
    );

    expect(result).toEqual([
      { id: "a", x: 0, y: 0, rank: 0 },
      { id: "b", x: 240, y: 0, rank: 1 },
      { id: "c", x: 480, y: 0, rank: 2 },
    ]);
  });

  it("is independent of edge input order", () => {
    const nodeIds = ["root", "left", "right", "join"];
    const edges = [
      edge("rl", "root", "left"),
      edge("rr", "root", "right"),
      edge("lj", "left", "join"),
      edge("rj", "right", "join"),
    ];

    expect(layoutByRank(nodeIds, [...edges].reverse())).toEqual(
      layoutByRank(nodeIds, edges),
    );
  });

  it("ignores parallel edges when calculating ranks and coordinates", () => {
    const nodeIds = ["a", "b", "c"];
    const simpleEdges = [edge("ab", "a", "b"), edge("bc", "b", "c")];
    const parallelEdges = [
      ...simpleEdges,
      edge("ab-again", "a", "b", "integrate"),
    ];

    expect(layoutByRank(nodeIds, parallelEdges)).toEqual(
      layoutByRank(nodeIds, simpleEdges),
    );
  });

  it("keeps a self-loop stable at rank zero", () => {
    expect(layoutByRank(["a"], [edge("aa", "a", "a")])).toEqual([
      { id: "a", x: 0, y: 0, rank: 0 },
    ]);
  });

  it("uses the longest parent path for a diamond join", () => {
    const result = layoutByRank(
      ["root", "right", "left", "join"],
      [
        edge("lj", "left", "join"),
        edge("rr", "root", "right"),
        edge("rj", "right", "join"),
        edge("rl", "root", "left"),
      ],
    );

    expect(result).toEqual([
      { id: "root", x: 0, y: 0, rank: 0 },
      { id: "right", x: 240, y: 0, rank: 1 },
      { id: "left", x: 240, y: 96, rank: 1 },
      { id: "join", x: 480, y: 0, rank: 2 },
    ]);
  });

  it(
    "lays out a 20,000-node chain without overflowing the call stack",
    () => {
      const nodeIds = Array.from({ length: 20_000 }, (_, index) => `n${index}`);
      const edges = nodeIds.slice(1).map((id, index) =>
        edge(`e${index}`, nodeIds[index] ?? "", id),
      );

      const result = layoutByRank(nodeIds, edges);
      const repeated = layoutByRank(nodeIds, edges);

      expect(result).toHaveLength(20_000);
      expect(result.at(-1)).toEqual({
        id: "n19999",
        rank: 19_999,
        x: 19_999 * 240,
        y: 0,
      });
      expect(repeated).toEqual(result);
    },
    15_000,
  );

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
