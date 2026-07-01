import { z } from "zod";

const requiredStringSchema = z.string().trim().min(1);
const currencySchema = z.string().length(3);

export const layerSchema = z.enum([
  "materials",
  "manufacturing",
  "chips",
  "interconnect",
  "infrastructure",
  "platform",
  "applications",
]);

export const relationStatusSchema = z.enum([
  "company_confirmed",
  "counterparty_confirmed",
  "regulatory_disclosure",
  "multi_source_report",
  "market_speculation",
]);

export const marketSchema = z.enum([
  "US",
  "CN",
  "HK",
  "TW",
  "KR",
  "JP",
  "EU",
  "PRIVATE",
]);

export const companySchema = z.object({
  id: requiredStringSchema,
  name: requiredStringSchema,
  ticker: requiredStringSchema,
  exchange: requiredStringSchema,
  market: marketSchema,
  currency: currencySchema,
});

export const nodeSchema = z
  .object({
    id: requiredStringSchema,
    layer: layerSchema,
    kind: z.enum([
      "material",
      "equipment",
      "component",
      "system",
      "software",
      "application",
    ]),
    name: requiredStringSchema,
    englishName: requiredStringSchema.optional(),
    summary: z.string().trim().min(8),
    technology: z.string().trim().min(20),
    barriers: z.array(requiredStringSchema).min(1),
    drivers: z.array(requiredStringSchema).min(1),
    risks: z.array(requiredStringSchema).min(1),
    companyIds: z.array(requiredStringSchema).min(1),
    sourceIds: z.array(requiredStringSchema).min(1),
  })
  .superRefine((node, context) => {
    if (node.kind === "material" && new Set(node.companyIds).size < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyIds"],
        message: "material nodes require at least two distinct leaders",
      });
    }
  });

export const sourceSchema = z.object({
  id: requiredStringSchema,
  title: requiredStringSchema,
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
      message: "source URL must use http or https",
    }),
  publisher: requiredStringSchema,
  publishedAt: z.string().date().optional(),
  checkedAt: z.string().datetime(),
});

export const industryEdgeSchema = z.object({
  id: requiredStringSchema,
  from: requiredStringSchema,
  to: requiredStringSchema,
  type: z.enum(["supply", "integrate", "deploy"]),
});

export const supplyRelationSchema = z.object({
  id: requiredStringSchema,
  supplierId: requiredStringSchema,
  customerId: requiredStringSchema,
  nodeId: requiredStringSchema,
  product: z.string().trim().min(2),
  status: relationStatusSchema,
  evidenceSourceIds: z.array(requiredStringSchema).min(1),
  announcedAt: z.string().date().optional(),
});

export const companyNodeRoleSchema = z.object({
  id: requiredStringSchema,
  companyId: requiredStringSchema,
  nodeId: requiredStringSchema,
  role: z.string().trim().min(2),
  product: z.string().trim().min(2).optional(),
  sourceIds: z.array(requiredStringSchema).min(1),
});

export const marketSnapshotSchema = z.object({
  companyId: requiredStringSchema,
  price: z.number().nonnegative(),
  changePct: z.number(),
  currency: currencySchema,
  tradedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  delayMinutes: z.number().int().nonnegative(),
  ttmEps: z.number().nullable(),
  ttmPe: z.number().positive().nullable(),
});

export const atlasSnapshotSchema = z
  .object({
    nodes: z.array(nodeSchema),
    companies: z.array(companySchema),
    companyNodeRoles: z.array(companyNodeRoleSchema),
    industryEdges: z.array(industryEdgeSchema),
    supplyRelations: z.array(supplyRelationSchema),
    marketSnapshots: z.array(marketSnapshotSchema),
    sources: z.array(sourceSchema),
  })
  .superRefine((snapshot, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: z.ZodIssueCode.custom, path, message });

    const requireUniqueIds = (
      values: ReadonlyArray<{ id: string }>,
      collection: string,
    ) => {
      const seen = new Set<string>();
      values.forEach(({ id }, index) => {
        if (seen.has(id)) {
          issue([collection, index, "id"], `duplicate ${collection} id: ${id}`);
        }
        seen.add(id);
      });
    };

    requireUniqueIds(snapshot.nodes, "nodes");
    requireUniqueIds(snapshot.companies, "companies");
    requireUniqueIds(snapshot.sources, "sources");
    requireUniqueIds(snapshot.industryEdges, "industryEdges");
    requireUniqueIds(snapshot.supplyRelations, "supplyRelations");
    requireUniqueIds(snapshot.companyNodeRoles, "companyNodeRoles");

    const companyIds = new Set(snapshot.companies.map(({ id }) => id));
    const nodeIds = new Set(snapshot.nodes.map(({ id }) => id));
    const sourceIds = new Set(snapshot.sources.map(({ id }) => id));
    const rolesByAssociation = new Set(
      snapshot.companyNodeRoles.map(({ companyId, nodeId }) =>
        `${nodeId}\u0000${companyId}`,
      ),
    );

    snapshot.nodes.forEach((node, nodeIndex) => {
      node.companyIds.forEach((companyId, companyIndex) => {
        if (!companyIds.has(companyId)) {
          issue(
            ["nodes", nodeIndex, "companyIds", companyIndex],
            `unknown company id: ${companyId}`,
          );
        }
        if (!rolesByAssociation.has(`${node.id}\u0000${companyId}`)) {
          issue(
            ["nodes", nodeIndex, "companyIds", companyIndex],
            `missing evidenced company-node role: ${companyId}`,
          );
        }
      });
      node.sourceIds.forEach((sourceId, sourceIndex) => {
        if (!sourceIds.has(sourceId)) {
          issue(
            ["nodes", nodeIndex, "sourceIds", sourceIndex],
            `unknown source id: ${sourceId}`,
          );
        }
      });
    });

    snapshot.companyNodeRoles.forEach((role, roleIndex) => {
      if (!companyIds.has(role.companyId)) {
        issue(
          ["companyNodeRoles", roleIndex, "companyId"],
          `unknown company id: ${role.companyId}`,
        );
      }
      const roleNode = snapshot.nodes.find(({ id }) => id === role.nodeId);
      if (!roleNode) {
        issue(
          ["companyNodeRoles", roleIndex, "nodeId"],
          `unknown node id: ${role.nodeId}`,
        );
      } else if (!roleNode.companyIds.includes(role.companyId)) {
        issue(
          ["companyNodeRoles", roleIndex, "companyId"],
          `company is absent from node.companyIds: ${role.companyId}`,
        );
      }
      role.sourceIds.forEach((sourceId, sourceIndex) => {
        if (!sourceIds.has(sourceId)) {
          issue(
            ["companyNodeRoles", roleIndex, "sourceIds", sourceIndex],
            `unknown source id: ${sourceId}`,
          );
        }
      });
    });

    snapshot.industryEdges.forEach((edge, edgeIndex) => {
      if (!nodeIds.has(edge.from)) {
        issue(
          ["industryEdges", edgeIndex, "from"],
          `unknown node id: ${edge.from}`,
        );
      }
      if (!nodeIds.has(edge.to)) {
        issue(
          ["industryEdges", edgeIndex, "to"],
          `unknown node id: ${edge.to}`,
        );
      }
    });

    snapshot.supplyRelations.forEach((relation, relationIndex) => {
      if (!companyIds.has(relation.supplierId)) {
        issue(
          ["supplyRelations", relationIndex, "supplierId"],
          `unknown company id: ${relation.supplierId}`,
        );
      }
      if (!companyIds.has(relation.customerId)) {
        issue(
          ["supplyRelations", relationIndex, "customerId"],
          `unknown company id: ${relation.customerId}`,
        );
      }
      if (!nodeIds.has(relation.nodeId)) {
        issue(
          ["supplyRelations", relationIndex, "nodeId"],
          `unknown node id: ${relation.nodeId}`,
        );
      }
      relation.evidenceSourceIds.forEach((sourceId, sourceIndex) => {
        if (!sourceIds.has(sourceId)) {
          issue(
            [
              "supplyRelations",
              relationIndex,
              "evidenceSourceIds",
              sourceIndex,
            ],
            `unknown source id: ${sourceId}`,
          );
        }
      });
    });

    const marketKeys = new Set<string>();
    snapshot.marketSnapshots.forEach((marketSnapshot, snapshotIndex) => {
      if (!companyIds.has(marketSnapshot.companyId)) {
        issue(
          ["marketSnapshots", snapshotIndex, "companyId"],
          `unknown company id: ${marketSnapshot.companyId}`,
        );
      }
      const key = `${marketSnapshot.companyId}\u0000${marketSnapshot.tradedAt}`;
      if (marketKeys.has(key)) {
        issue(
          ["marketSnapshots", snapshotIndex, "tradedAt"],
          `duplicate market snapshot key: ${marketSnapshot.companyId} ${marketSnapshot.tradedAt}`,
        );
      }
      marketKeys.add(key);
    });
  });

export type AtlasNode = z.infer<typeof nodeSchema>;
export type AtlasMarket = z.infer<typeof marketSchema>;
export type AtlasCompany = z.infer<typeof companySchema>;
export type AtlasIndustryEdge = z.infer<typeof industryEdgeSchema>;
export type AtlasSupplyRelation = z.infer<typeof supplyRelationSchema>;
export type CompanyNodeRole = z.infer<typeof companyNodeRoleSchema>;
export type AtlasMarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type AtlasSource = z.infer<typeof sourceSchema>;
export type AtlasSnapshot = z.infer<typeof atlasSnapshotSchema>;
