import { atlasRepository } from "@/lib/atlas/repository";
import {
  atlasSnapshotSchema,
  layerSchema,
  type AtlasNode,
  type AtlasSnapshot,
} from "@/lib/atlas/schema";
import { atlasStageById, type AtlasStageId } from "@/lib/atlas/stage-map";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

const jsonHeaders = {
  "Cache-Control": CACHE_CONTROL,
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const filterSnapshotByLayer = (
  snapshot: AtlasSnapshot,
  layer: AtlasNode["layer"],
): AtlasSnapshot => {
  const layerNodeIds = new Set(
    snapshot.nodes
      .filter((node) => node.layer === layer)
      .map(({ id }) => id),
  );
  const visibleNodeIds = new Set(layerNodeIds);

  for (const edge of snapshot.industryEdges) {
    if (layerNodeIds.has(edge.from)) visibleNodeIds.add(edge.to);
    if (layerNodeIds.has(edge.to)) visibleNodeIds.add(edge.from);
  }

  const nodes = snapshot.nodes.filter(({ id }) => visibleNodeIds.has(id));
  const companyIds = new Set(nodes.flatMap(({ companyIds }) => companyIds));
  const sourceIds = new Set(nodes.flatMap(({ sourceIds }) => sourceIds));

  const companyNodeRoles = snapshot.companyNodeRoles.filter((role) => {
    if (!visibleNodeIds.has(role.nodeId)) return false;
    companyIds.add(role.companyId);
    for (const sourceId of role.sourceIds) sourceIds.add(sourceId);
    return true;
  });

  const subnodeCompanyCoverages = snapshot.subnodeCompanyCoverages.filter(
    (coverage) => {
      const stage = atlasStageById.get(coverage.stageId as AtlasStageId);
      const group = stage?.groups.find(({ id }) => id === coverage.groupId);
      const subnode = group?.nodes.find(({ id }) => id === coverage.subnodeId);
      if (!subnode?.realNodeId || !visibleNodeIds.has(subnode.realNodeId)) {
        return false;
      }

      companyIds.add(coverage.companyId);
      for (const sourceId of coverage.sourceIds) sourceIds.add(sourceId);
      return true;
    },
  );

  const supplyRelations = snapshot.supplyRelations.filter((relation) => {
    if (!visibleNodeIds.has(relation.nodeId)) return false;
    companyIds.add(relation.supplierId);
    companyIds.add(relation.customerId);
    for (const sourceId of relation.evidenceSourceIds) sourceIds.add(sourceId);
    return true;
  });

  const industryEdges = snapshot.industryEdges.filter(
    ({ from, to }) =>
      visibleNodeIds.has(from) &&
      visibleNodeIds.has(to) &&
      (layerNodeIds.has(from) || layerNodeIds.has(to)),
  );
  const companies = snapshot.companies.filter(({ id }) => companyIds.has(id));
  const marketSnapshots = snapshot.marketSnapshots.filter(({ companyId }) =>
    companyIds.has(companyId),
  );
  const sources = snapshot.sources.filter(({ id }) => sourceIds.has(id));

  return atlasSnapshotSchema.parse({
    nodes,
    companies,
    companyNodeRoles,
    subnodeCompanyCoverages,
    industryEdges,
    supplyRelations,
    marketSnapshots,
    sources,
  });
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLayer = url.searchParams.get("layer") ?? "interconnect";
  const layer = layerSchema.safeParse(rawLayer);

  if (!layer.success) {
    return json(
      {
        error: {
          code: "invalid_layer",
          message: `Unknown atlas layer: ${rawLayer}`,
        },
      },
      400,
    );
  }

  const snapshot = await atlasRepository.getSnapshot();
  return json(filterSnapshotByLayer(snapshot, layer.data));
}
