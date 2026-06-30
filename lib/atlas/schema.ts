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
  url: z.string().url(),
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

export const atlasSnapshotSchema = z.object({
  nodes: z.array(nodeSchema),
  companies: z.array(companySchema),
  industryEdges: z.array(industryEdgeSchema),
  supplyRelations: z.array(supplyRelationSchema),
  marketSnapshots: z.array(marketSnapshotSchema),
  sources: z.array(sourceSchema),
});

export type AtlasNode = z.infer<typeof nodeSchema>;
export type AtlasMarket = z.infer<typeof marketSchema>;
export type AtlasCompany = z.infer<typeof companySchema>;
export type AtlasIndustryEdge = z.infer<typeof industryEdgeSchema>;
export type AtlasSupplyRelation = z.infer<typeof supplyRelationSchema>;
export type AtlasMarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type AtlasSource = z.infer<typeof sourceSchema>;
export type AtlasSnapshot = z.infer<typeof atlasSnapshotSchema>;
