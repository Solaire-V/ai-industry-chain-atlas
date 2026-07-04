import { createClient } from "@supabase/supabase-js";

import { atlasSnapshotSchema, type AtlasSnapshot } from "@/lib/atlas/schema";
import type { AtlasRepository } from "@/lib/atlas/repository";

export interface AtlasRepositoryEnv {
  [key: string]: string | undefined;
  ATLAS_DATA_SOURCE?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface SupabaseErrorLike {
  message: string;
}

interface SupabaseClientLike {
  from(table: string): {
    select(columns?: string): PromiseLike<{
      data: unknown[] | null;
      error: SupabaseErrorLike | null;
    }>;
  };
}

type DbSource = {
  id: string;
  slug: string;
  title: string;
  url: string;
  publisher: string;
  published_at: string | null;
  checked_at: string;
  published?: boolean;
};

type DbCompany = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  exchange: string;
  market: string;
  currency: string;
  published?: boolean;
};

type DbIndustryNode = {
  id: string;
  slug: string;
  layer: string;
  kind: string;
  name: string;
  english_name: string | null;
  summary: string;
  technology: string;
  barriers: string[];
  drivers: string[];
  risks: string[];
  published?: boolean;
};

type DbCompanyNodeRole = {
  id: string;
  slug?: string | null;
  company_id: string;
  node_id: string;
  role: string;
  product: string | null;
  published?: boolean;
};

type DbIndustryEdge = {
  id: string;
  slug: string;
  from_node_id: string;
  to_node_id: string;
  type: string;
  published?: boolean;
};

type DbRelationEvidence = {
  source_id: string;
  industry_node_id: string | null;
  company_node_role_id: string | null;
  supply_relation_id: string | null;
  evidence_type: string;
};

type DbSupplyRelation = {
  id: string;
  slug: string | null;
  supplier_company_id: string;
  customer_company_id: string;
  node_id: string;
  product: string;
  status: string;
  announced_at: string | null;
  published?: boolean;
};

type DbMarketSnapshot = {
  company_id: string;
  price: number | string;
  change_pct: number | string;
  currency: string;
  traded_at: string;
  fetched_at: string;
  delay_minutes: number;
  ttm_eps: number | string | null;
  ttm_pe: number | string | null;
  market_cap?: number | string | null;
  pb?: number | string | null;
  ps?: number | string | null;
  turnover?: number | string | null;
  freshness_source: string | null;
  cached_at: string | null;
  error: string | null;
};

type DbSubnodeCompanyCoverage = {
  id: string;
  slug: string;
  stage_id: string;
  group_id: string;
  subnode_id: string;
  company_id: string;
  rank: number;
  priority: string;
  relevance: string;
  evidence_level: string;
  role: string;
  market_share_note: string | null;
  market_cap_note: string | null;
  published?: boolean;
};

type DbSubnodeCompanyCoverageSource = {
  coverage_id: string;
  source_id: string;
};

export interface SupabaseAtlasRows {
  sources: readonly DbSource[];
  companies: readonly DbCompany[];
  industryNodes: readonly DbIndustryNode[];
  companyNodeRoles: readonly DbCompanyNodeRole[];
  industryEdges: readonly DbIndustryEdge[];
  relationEvidence: readonly DbRelationEvidence[];
  supplyRelations: readonly DbSupplyRelation[];
  marketSnapshots: readonly DbMarketSnapshot[];
  subnodeCompanyCoverages: readonly DbSubnodeCompanyCoverage[];
  subnodeCompanyCoverageSources: readonly DbSubnodeCompanyCoverageSource[];
}

const published = <T extends { published?: boolean }>(rows: readonly T[]) =>
  rows.filter((row) => row.published !== false);

const unique = (values: Iterable<string>) => [...new Set(values)];

const defined = (value: string | undefined): value is string =>
  typeof value === "string" && value.length > 0;

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const toIsoDateTime = (value: string) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : value;
};

const optionalIsoDateTime = (value: string | null) =>
  value ? toIsoDateTime(value) : undefined;

const stableRoleId = (
  nodeId: string,
  companyId: string,
  role: DbCompanyNodeRole,
) => {
  if (role.slug) return role.slug;

  const suffix = `${role.product ?? role.role}-${role.id}`
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${nodeId}-${companyId}-${suffix}`;
};

export const mapSupabaseRowsToAtlasSnapshot = (
  rows: SupabaseAtlasRows,
): AtlasSnapshot => {
  const sourceSlugByUuid = new Map(
    published(rows.sources).map((source) => [source.id, source.slug]),
  );
  const companySlugByUuid = new Map(
    published(rows.companies).map((company) => [company.id, company.slug]),
  );
  const nodeSlugByUuid = new Map(
    published(rows.industryNodes).map((node) => [node.id, node.slug]),
  );
  const coverageByUuid = new Map(
    published(rows.subnodeCompanyCoverages).map((coverage) => [
      coverage.id,
      coverage,
    ]),
  );

  const evidenceSources = (
    evidenceType: DbRelationEvidence["evidence_type"],
    targetId: string,
  ) =>
    unique(
      rows.relationEvidence
        .filter((evidence) => {
          if (evidence.evidence_type !== evidenceType) return false;
          if (evidenceType === "node") {
            return evidence.industry_node_id === targetId;
          }
          if (evidenceType === "company_node_role") {
            return evidence.company_node_role_id === targetId;
          }
          return evidence.supply_relation_id === targetId;
        })
        .map(({ source_id }) => sourceSlugByUuid.get(source_id))
        .filter(defined),
    );

  const coverageSources = (coverageId: string) =>
    unique(
      rows.subnodeCompanyCoverageSources
        .filter((item) => item.coverage_id === coverageId)
        .map(({ source_id }) => sourceSlugByUuid.get(source_id))
        .filter(defined),
    );

  const roleRows = published(rows.companyNodeRoles);
  const companyNodeRoles = roleRows.map((role) => {
    const companyId = companySlugByUuid.get(role.company_id);
    const nodeId = nodeSlugByUuid.get(role.node_id);
    if (!companyId || !nodeId) {
      throw new Error(`dangling company_node_roles row: ${role.id}`);
    }
    return {
      id: stableRoleId(nodeId, companyId, role),
      companyId,
      nodeId,
      role: role.role,
      product: role.product ?? undefined,
      sourceIds: evidenceSources("company_node_role", role.id),
    };
  });

  const nodes = published(rows.industryNodes).map((node) => ({
    id: node.slug,
    layer: node.layer,
    kind: node.kind,
    name: node.name,
    englishName: node.english_name ?? undefined,
    summary: node.summary,
    technology: node.technology,
    barriers: node.barriers,
    drivers: node.drivers,
    risks: node.risks,
    companyIds: unique(
      roleRows
        .filter((role) => role.node_id === node.id)
        .map(({ company_id }) => companySlugByUuid.get(company_id))
        .filter(defined),
    ),
    sourceIds: evidenceSources("node", node.id),
  }));

  const companies = published(rows.companies).map((company) => ({
    id: company.slug,
    name: company.name,
    ticker: company.ticker,
    exchange: company.exchange,
    market: company.market,
    currency: company.currency,
  }));

  const sources = published(rows.sources).map((source) => ({
    id: source.slug,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    publishedAt: source.published_at ?? undefined,
    checkedAt: toIsoDateTime(source.checked_at),
  }));

  const industryEdges = published(rows.industryEdges).map((edge) => {
    const from = nodeSlugByUuid.get(edge.from_node_id);
    const to = nodeSlugByUuid.get(edge.to_node_id);
    if (!from || !to) throw new Error(`dangling industry_edges row: ${edge.id}`);
    return {
      id: edge.slug,
      from,
      to,
      type: edge.type,
    };
  });

  const supplyRelations = published(rows.supplyRelations).map((relation) => {
    const supplierId = companySlugByUuid.get(relation.supplier_company_id);
    const customerId = companySlugByUuid.get(relation.customer_company_id);
    const nodeId = nodeSlugByUuid.get(relation.node_id);
    if (!supplierId || !customerId || !nodeId) {
      throw new Error(`dangling supply_relations row: ${relation.id}`);
    }
    return {
      id: relation.slug ?? relation.id,
      supplierId,
      customerId,
      nodeId,
      product: relation.product,
      status: relation.status,
      evidenceSourceIds: evidenceSources("supply_relation", relation.id),
      announcedAt: relation.announced_at ?? undefined,
    };
  });

  const subnodeCompanyCoverages = published(rows.subnodeCompanyCoverages).map(
    (coverage) => {
      const companyId = companySlugByUuid.get(coverage.company_id);
      if (!companyId) {
        throw new Error(`dangling subnode_company_coverages row: ${coverage.id}`);
      }
      return {
        id: coverage.slug,
        stageId: coverage.stage_id,
        groupId: coverage.group_id,
        subnodeId: coverage.subnode_id,
        companyId,
        rank: coverage.rank,
        priority: coverage.priority,
        relevance: coverage.relevance,
        evidenceLevel: coverage.evidence_level,
        role: coverage.role,
        marketShareNote: coverage.market_share_note ?? undefined,
        marketCapNote: coverage.market_cap_note ?? undefined,
        sourceIds: coverageSources(coverage.id),
      };
    },
  );

  const marketSnapshots = rows.marketSnapshots
    .filter(({ company_id }) => companySlugByUuid.has(company_id))
    .map((snapshot) => {
      const companyId = companySlugByUuid.get(snapshot.company_id);
      if (!companyId) {
        throw new Error(`dangling market_snapshots row: ${snapshot.company_id}`);
      }
      return {
        companyId,
        price: toNumber(snapshot.price) ?? 0,
        changePct: toNumber(snapshot.change_pct) ?? 0,
        currency: snapshot.currency,
        tradedAt: toIsoDateTime(snapshot.traded_at),
        fetchedAt: toIsoDateTime(snapshot.fetched_at),
        delayMinutes: snapshot.delay_minutes,
        ttmEps: toNumber(snapshot.ttm_eps),
        ttmPe: toNumber(snapshot.ttm_pe),
        marketCap: toNumber(snapshot.market_cap) ?? undefined,
        pb: toNumber(snapshot.pb) ?? undefined,
        ps: toNumber(snapshot.ps) ?? undefined,
        turnover: toNumber(snapshot.turnover) ?? undefined,
        freshnessSource: snapshot.freshness_source ?? undefined,
        cachedAt: optionalIsoDateTime(snapshot.cached_at),
        error: snapshot.error ?? undefined,
      };
    });

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

const selectAll = async <T>(
  client: SupabaseClientLike,
  table: string,
): Promise<T[]> => {
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(`Supabase ${table} query failed: ${error.message}`);
  return (data ?? []) as T[];
};

export const loadSupabaseAtlasSnapshot = async (
  client: SupabaseClientLike,
): Promise<AtlasSnapshot> => {
  const [
    sources,
    companies,
    industryNodes,
    companyNodeRoles,
    industryEdges,
    relationEvidence,
    supplyRelations,
    marketSnapshots,
    subnodeCompanyCoverages,
    subnodeCompanyCoverageSources,
  ] = await Promise.all([
    selectAll<DbSource>(client, "sources"),
    selectAll<DbCompany>(client, "companies"),
    selectAll<DbIndustryNode>(client, "industry_nodes"),
    selectAll<DbCompanyNodeRole>(client, "company_node_roles"),
    selectAll<DbIndustryEdge>(client, "industry_edges"),
    selectAll<DbRelationEvidence>(client, "relation_evidence"),
    selectAll<DbSupplyRelation>(client, "supply_relations"),
    selectAll<DbMarketSnapshot>(client, "market_snapshots"),
    selectAll<DbSubnodeCompanyCoverage>(client, "subnode_company_coverages"),
    selectAll<DbSubnodeCompanyCoverageSource>(
      client,
      "subnode_company_coverage_sources",
    ),
  ]);

  return mapSupabaseRowsToAtlasSnapshot({
    sources,
    companies,
    industryNodes,
    companyNodeRoles,
    industryEdges,
    relationEvidence,
    supplyRelations,
    marketSnapshots,
    subnodeCompanyCoverages,
    subnodeCompanyCoverageSources,
  });
};

export const createSupabaseAtlasRepository = (
  env: AtlasRepositoryEnv,
): AtlasRepository => {
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when ATLAS_DATA_SOURCE=supabase",
    );
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseClientLike;

  return {
    async getSnapshot() {
      return loadSupabaseAtlasSnapshot(client);
    },
  };
};
