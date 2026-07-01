import type { AtlasIndustryEdge } from "@/lib/atlas/schema";

export const RELATIONSHIP_MODES = ["supply", "value", "all"] as const;

export type RelationshipMode = (typeof RELATIONSHIP_MODES)[number];
export type RelationshipViewMode = RelationshipMode;

export const isRelationshipMode = (
  value: unknown,
): value is RelationshipMode =>
  RELATIONSHIP_MODES.some((mode) => mode === value);

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
  mode: RelationshipMode,
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

  return uniqueNodeIds.map((id) => {
    const rank = rankByNode.get(id) ?? 0;
    return { id, x: rank * 240, y: yByNode.get(id) ?? 0, rank };
  });
}

function findStronglyConnectedComponents(
  nodeIds: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): Map<string, number> {
  const reverseAdjacency = new Map(
    nodeIds.map((id) => [id, [] as string[]] as const),
  );
  for (const [from, children] of adjacency) {
    for (const to of children) reverseAdjacency.get(to)?.push(from);
  }

  const visited = new Set<string>();
  const finishOrder: string[] = [];

  for (const startId of nodeIds) {
    if (visited.has(startId)) continue;
    visited.add(startId);
    const stack = [{ nodeId: startId, nextChildIndex: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) break;
      const children = adjacency.get(frame.nodeId) ?? [];
      const childId = children[frame.nextChildIndex];

      if (childId !== undefined) {
        frame.nextChildIndex += 1;
        if (!visited.has(childId)) {
          visited.add(childId);
          stack.push({ nodeId: childId, nextChildIndex: 0 });
        }
        continue;
      }

      finishOrder.push(frame.nodeId);
      stack.pop();
    }
  }

  const componentByNode = new Map<string, number>();
  let componentCount = 0;

  for (let index = finishOrder.length - 1; index >= 0; index -= 1) {
    const startId = finishOrder[index];
    if (startId === undefined || componentByNode.has(startId)) continue;
    const stack = [startId];
    componentByNode.set(startId, componentCount);
    while (stack.length > 0) {
      const nodeId = stack.pop();
      if (nodeId === undefined) continue;
      for (const parentId of reverseAdjacency.get(nodeId) ?? []) {
        if (componentByNode.has(parentId)) continue;
        componentByNode.set(parentId, componentCount);
        stack.push(parentId);
      }
    }
    componentCount += 1;
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
