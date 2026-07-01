import type { AtlasIndustryEdge } from "@/lib/atlas/schema";

export type RelationshipViewMode = "supply" | "value" | "all";

export type RankedLayoutNode = {
  id: string;
  x: number;
  y: number;
  rank: number;
};

export function getNeighborhood(
  nodeId: string,
  edges: readonly AtlasIndustryEdge[],
): Set<string> {
  const neighborhood = new Set([nodeId]);

  for (const edge of edges) {
    if (edge.from === nodeId) neighborhood.add(edge.to);
    if (edge.to === nodeId) neighborhood.add(edge.from);
  }

  return neighborhood;
}

export function filterEdgesByMode(
  edges: readonly AtlasIndustryEdge[],
  mode: RelationshipViewMode,
): AtlasIndustryEdge[] {
  if (mode === "all") return edges.slice();
  if (mode === "supply") {
    return edges.filter(({ type }) => type === "supply");
  }
  return edges.filter(({ type }) => type === "integrate" || type === "deploy");
}

export function layoutByRank(
  nodeIds: readonly string[],
  edges: readonly AtlasIndustryEdge[],
): RankedLayoutNode[] {
  const uniqueNodeIds = [...new Set(nodeIds)];
  const nodeIdSet = new Set(uniqueNodeIds);
  const validEdges = edges.filter(
    ({ from, to }) => nodeIdSet.has(from) && nodeIdSet.has(to),
  );
  const adjacency = new Map(
    uniqueNodeIds.map((id) => [id, [] as string[]] as const),
  );

  for (const { from, to } of validEdges) {
    adjacency.get(from)?.push(to);
  }

  const componentByNode = findStronglyConnectedComponents(
    uniqueNodeIds,
    adjacency,
  );
  const componentCount = new Set(componentByNode.values()).size;
  const componentChildren = Array.from(
    { length: componentCount },
    () => new Set<number>(),
  );
  const indegree = Array<number>(componentCount).fill(0);

  for (const { from, to } of validEdges) {
    const fromComponent = componentByNode.get(from);
    const toComponent = componentByNode.get(to);
    if (
      fromComponent === undefined ||
      toComponent === undefined ||
      fromComponent === toComponent ||
      componentChildren[fromComponent]?.has(toComponent)
    ) {
      continue;
    }
    componentChildren[fromComponent]?.add(toComponent);
    indegree[toComponent] = (indegree[toComponent] ?? 0) + 1;
  }

  const componentRanks = rankComponentGraph(componentChildren, indegree);
  const rankByNode = new Map(
    uniqueNodeIds.map((id) => [
      id,
      componentRanks[componentByNode.get(id) ?? 0] ?? 0,
    ]),
  );
  const connectedNodes = new Set(
    validEdges.flatMap(({ from, to }) => [from, to]),
  );
  const yByNode = new Map<string, number>();
  const nodesByRank = new Map<number, string[]>();

  for (const id of uniqueNodeIds) {
    const rank = rankByNode.get(id) ?? 0;
    const rankNodes = nodesByRank.get(rank) ?? [];
    rankNodes.push(id);
    nodesByRank.set(rank, rankNodes);
  }

  for (const [rank, rankNodes] of nodesByRank) {
    const orderedNodes =
      rank === 0
        ? [
            ...rankNodes.filter((id) => connectedNodes.has(id)),
            ...rankNodes.filter((id) => !connectedNodes.has(id)),
          ]
        : rankNodes;
    orderedNodes.forEach((id, siblingIndex) => {
      yByNode.set(id, siblingIndex * 96);
    });
  }

  return nodeIds.map((id) => {
    const rank = rankByNode.get(id) ?? 0;
    return { id, x: rank * 240, y: yByNode.get(id) ?? 0, rank };
  });
}

function findStronglyConnectedComponents(
  nodeIds: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): Map<string, number> {
  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const componentByNode = new Map<string, number>();
  let componentCount = 0;

  const visit = (nodeId: string) => {
    const nodeIndex = nextIndex++;
    indices.set(nodeId, nodeIndex);
    lowLinks.set(nodeId, nodeIndex);
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const childId of adjacency.get(nodeId) ?? []) {
      if (!indices.has(childId)) {
        visit(childId);
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId) ?? nodeIndex, lowLinks.get(childId) ?? 0),
        );
      } else if (onStack.has(childId)) {
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId) ?? nodeIndex, indices.get(childId) ?? 0),
        );
      }
    }

    if (lowLinks.get(nodeId) !== indices.get(nodeId)) return;

    while (stack.length > 0) {
      const member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      componentByNode.set(member, componentCount);
      if (member === nodeId) break;
    }
    componentCount += 1;
  };

  for (const nodeId of nodeIds) {
    if (!indices.has(nodeId)) visit(nodeId);
  }

  return componentByNode;
}

function rankComponentGraph(
  children: readonly ReadonlySet<number>[],
  initialIndegree: readonly number[],
): number[] {
  const indegree = [...initialIndegree];
  const ranks = Array<number>(children.length).fill(0);
  const ready = indegree
    .map((degree, component) => ({ degree, component }))
    .filter(({ degree }) => degree === 0)
    .map(({ component }) => component);
  let readyIndex = 0;

  while (readyIndex < ready.length) {
    const component = ready[readyIndex++];
    if (component === undefined) continue;

    for (const child of children[component] ?? []) {
      ranks[child] = Math.max(ranks[child] ?? 0, (ranks[component] ?? 0) + 1);
      indegree[child] = (indegree[child] ?? 0) - 1;
      if (indegree[child] === 0) ready.push(child);
    }
  }

  return ranks;
}
