import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import { verticalSlice } from "@/content/seed/vertical-slice";
import { atlasSnapshotSchema, type AtlasSnapshot } from "@/lib/atlas/schema";

type SupabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
};

type SupabaseSelectResult<T extends Record<string, unknown>> = PromiseLike<{
  data: T[] | null;
  error: SupabaseError | null;
}>;

type SupabaseMutationResult = PromiseLike<{
  error: SupabaseError | null;
}>;

type SupabaseWriteClient = {
  from: (table: string) => {
    select: (columns: string) => SupabaseSelectResult<Record<string, unknown>>;
    upsert: (
      rows: readonly Record<string, unknown>[],
      options: { onConflict: string },
    ) => SupabaseMutationResult;
    insert: (rows: readonly Record<string, unknown>[]) => SupabaseMutationResult;
  };
};

type SeedSyncPlan = {
  tables: Record<string, number>;
};

type EnvMap = Record<string, string | undefined>;

const chunkSize = 400;

export const seedSyncConflictKeys = {
  sources: "slug",
  companies: "slug",
  companyAliases: "company_id,alias,alias_type",
  industryNodes: "slug",
  companyNodeRoles: "slug",
  industryEdges: "slug",
  supplyRelations: "slug",
  subnodeCompanyCoverages: "stage_id,group_id,subnode_id,rank",
  subnodeCompanyCoverageSources: "coverage_id,source_id",
} as const;

const chunk = <T>(rows: readonly T[], size = chunkSize) => {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const uniqueAliasRows = (snapshot: AtlasSnapshot) => {
  const seen = new Set<string>();
  const rows: {
    company_slug: string;
    alias: string;
    alias_type: string;
    locale: string;
  }[] = [];

  for (const company of snapshot.companies) {
    const candidates: [string, string, string][] = [
      [company.name, "display", "zh-CN"],
      [company.ticker, "ticker", "und"],
      [company.id, "search", "und"],
    ];

    for (const [alias, aliasType, locale] of candidates) {
      const key = `${company.id}\u0000${alias}\u0000${aliasType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        company_slug: company.id,
        alias,
        alias_type: aliasType,
        locale,
      });
    }
  }

  return rows;
};

const nodeEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.nodes.flatMap((node) =>
    node.sourceIds.map((sourceId) => ({
      source_slug: sourceId,
      target_slug: node.id,
      evidence_type: "node" as const,
    })),
  );

const roleEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.companyNodeRoles.flatMap((role) =>
    role.sourceIds.map((sourceId) => ({
      source_slug: sourceId,
      target_slug: role.id,
      evidence_type: "company_node_role" as const,
    })),
  );

const supplyEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.supplyRelations.flatMap((relation) =>
    relation.evidenceSourceIds.map((sourceId) => ({
      source_slug: sourceId,
      target_slug: relation.id,
      evidence_type: "supply_relation" as const,
    })),
  );

const coverageSourceRows = (snapshot: AtlasSnapshot) =>
  snapshot.subnodeCompanyCoverages.flatMap((coverage) =>
    coverage.sourceIds.map((sourceId) => ({
      coverage_slug: coverage.id,
      source_slug: sourceId,
    })),
  );

export const buildSeedSyncPlan = (input: AtlasSnapshot): SeedSyncPlan => {
  const snapshot = atlasSnapshotSchema.parse(input);

  return {
    tables: {
      sources: snapshot.sources.length,
      companies: snapshot.companies.length,
      company_aliases: uniqueAliasRows(snapshot).length,
      industry_nodes: snapshot.nodes.length,
      company_node_roles: snapshot.companyNodeRoles.length,
      industry_edges: snapshot.industryEdges.length,
      supply_relations: snapshot.supplyRelations.length,
      relation_evidence:
        nodeEvidenceRows(snapshot).length +
        roleEvidenceRows(snapshot).length +
        supplyEvidenceRows(snapshot).length,
      subnode_company_coverages: snapshot.subnodeCompanyCoverages.length,
      subnode_company_coverage_sources: coverageSourceRows(snapshot).length,
      market_snapshots: 0,
    },
  };
};

const parseEnvFile = (content: string): EnvMap => {
  const env: EnvMap = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    if (!key || rawValue === undefined) continue;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }

  return env;
};

const loadLocalEnv = async (): Promise<EnvMap> => {
  const files = [".env.local", ".env"];
  const env: EnvMap = {};

  for (const file of files) {
    try {
      Object.assign(env, parseEnvFile(await readFile(resolve(file), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return { ...env, ...process.env };
};

const requireUuid = (
  map: ReadonlyMap<string, string>,
  slug: string,
  table: string,
) => {
  const id = map.get(slug);
  if (!id) throw new Error(`Missing ${table} UUID for slug: ${slug}`);
  return id;
};

const fetchSlugMap = async (
  client: SupabaseWriteClient,
  table: string,
): Promise<Map<string, string>> => {
  const { data, error } = await client.from(table).select("id, slug");
  if (error) throw new Error(`Failed to read ${table}: ${error.message}`);
  return new Map(
    (data ?? [])
      .filter((row): row is { id: string; slug: string } =>
        typeof row.id === "string" && typeof row.slug === "string",
      )
      .map((row) => [row.slug, row.id]),
  );
};

const upsertRows = async (
  client: SupabaseWriteClient,
  table: string,
  rows: readonly Record<string, unknown>[],
  onConflict: string,
) => {
  for (const rowsChunk of chunk(rows)) {
    const { error } = await client
      .from(table)
      .upsert(rowsChunk, { onConflict });
    if (error) {
      const details = [error.code, error.details, error.hint].filter(Boolean).join(" ");
      throw new Error(
        `Failed to upsert ${table}: ${error.message}${details ? ` (${details})` : ""}`,
      );
    }
  }
};

const insertRows = async (
  client: SupabaseWriteClient,
  table: string,
  rows: readonly Record<string, unknown>[],
) => {
  for (const rowsChunk of chunk(rows)) {
    const { error } = await client.from(table).insert(rowsChunk);
    if (error) throw new Error(`Failed to insert ${table}: ${error.message}`);
  }
};

const fetchRelationEvidenceKeys = async (client: SupabaseWriteClient) => {
  const { data, error } = await client
    .from("relation_evidence")
    .select("source_id, industry_node_id, company_node_role_id, supply_relation_id");
  if (error) throw new Error(`Failed to read relation_evidence: ${error.message}`);

  return new Set(
    (data ?? []).map((row) => {
      const sourceId = typeof row.source_id === "string" ? row.source_id : "";
      const target =
        typeof row.industry_node_id === "string"
          ? row.industry_node_id
          : typeof row.company_node_role_id === "string"
            ? row.company_node_role_id
            : typeof row.supply_relation_id === "string"
              ? row.supply_relation_id
              : "";
      return `${sourceId}\u0000${target}`;
    }),
  );
};

export const syncSupabaseSeed = async ({
  execute = false,
  snapshot = verticalSlice,
}: {
  execute?: boolean;
  snapshot?: AtlasSnapshot;
} = {}) => {
  const parsedSnapshot = atlasSnapshotSchema.parse(snapshot);
  const plan = buildSeedSyncPlan(parsedSnapshot);

  if (!execute) return { mode: "dry-run" as const, plan };

  const env = await loadLocalEnv();
  const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL" : null,
      !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as SupabaseWriteClient;

  await upsertRows(
    client,
    "sources",
    parsedSnapshot.sources.map((source) => ({
      slug: source.id,
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      published_at: source.publishedAt ?? null,
      checked_at: source.checkedAt,
      published: true,
    })),
    seedSyncConflictKeys.sources,
  );

  await upsertRows(
    client,
    "companies",
    parsedSnapshot.companies.map((company) => ({
      slug: company.id,
      name: company.name,
      ticker: company.ticker,
      exchange: company.exchange,
      market: company.market,
      currency: company.currency,
      provider: "static_seed",
      provider_symbol: company.id,
      published: true,
    })),
    seedSyncConflictKeys.companies,
  );

  const companyIdBySlug = await fetchSlugMap(client, "companies");

  await upsertRows(
    client,
    "company_aliases",
    uniqueAliasRows(parsedSnapshot).map((alias) => ({
      company_id: requireUuid(companyIdBySlug, alias.company_slug, "companies"),
      alias: alias.alias,
      alias_type: alias.alias_type,
      locale: alias.locale,
      published: true,
    })),
    seedSyncConflictKeys.companyAliases,
  );

  await upsertRows(
    client,
    "industry_nodes",
    parsedSnapshot.nodes.map((node) => ({
      slug: node.id,
      layer: node.layer,
      kind: node.kind,
      name: node.name,
      english_name: node.englishName ?? null,
      summary: node.summary,
      technology: node.technology,
      barriers: node.barriers,
      drivers: node.drivers,
      risks: node.risks,
      published: true,
    })),
    seedSyncConflictKeys.industryNodes,
  );

  const nodeIdBySlug = await fetchSlugMap(client, "industry_nodes");

  await upsertRows(
    client,
    "company_node_roles",
    parsedSnapshot.companyNodeRoles.map((role) => ({
      slug: role.id,
      company_id: requireUuid(companyIdBySlug, role.companyId, "companies"),
      node_id: requireUuid(nodeIdBySlug, role.nodeId, "industry_nodes"),
      role: role.role,
      product: role.product ?? null,
      published: true,
    })),
    seedSyncConflictKeys.companyNodeRoles,
  );

  await upsertRows(
    client,
    "industry_edges",
    parsedSnapshot.industryEdges.map((edge) => ({
      slug: edge.id,
      from_node_id: requireUuid(nodeIdBySlug, edge.from, "industry_nodes"),
      to_node_id: requireUuid(nodeIdBySlug, edge.to, "industry_nodes"),
      type: edge.type,
      published: true,
    })),
    seedSyncConflictKeys.industryEdges,
  );

  await upsertRows(
    client,
    "supply_relations",
    parsedSnapshot.supplyRelations.map((relation) => ({
      slug: relation.id,
      supplier_company_id: requireUuid(
        companyIdBySlug,
        relation.supplierId,
        "companies",
      ),
      customer_company_id: requireUuid(
        companyIdBySlug,
        relation.customerId,
        "companies",
      ),
      node_id: requireUuid(nodeIdBySlug, relation.nodeId, "industry_nodes"),
      product: relation.product,
      status: relation.status,
      announced_at: relation.announcedAt ?? null,
      published: true,
    })),
    seedSyncConflictKeys.supplyRelations,
  );

  const roleIdBySlug = await fetchSlugMap(client, "company_node_roles");
  const sourceIdBySlug = await fetchSlugMap(client, "sources");
  const supplyIdBySlug = await fetchSlugMap(client, "supply_relations");

  const evidenceRows = [
    ...nodeEvidenceRows(parsedSnapshot).map((row) => ({
      source_id: requireUuid(sourceIdBySlug, row.source_slug, "sources"),
      industry_node_id: requireUuid(nodeIdBySlug, row.target_slug, "industry_nodes"),
      company_node_role_id: null,
      supply_relation_id: null,
      evidence_type: row.evidence_type,
    })),
    ...roleEvidenceRows(parsedSnapshot).map((row) => ({
      source_id: requireUuid(sourceIdBySlug, row.source_slug, "sources"),
      industry_node_id: null,
      company_node_role_id: requireUuid(
        roleIdBySlug,
        row.target_slug,
        "company_node_roles",
      ),
      supply_relation_id: null,
      evidence_type: row.evidence_type,
    })),
    ...supplyEvidenceRows(parsedSnapshot).map((row) => ({
      source_id: requireUuid(sourceIdBySlug, row.source_slug, "sources"),
      industry_node_id: null,
      company_node_role_id: null,
      supply_relation_id: requireUuid(
        supplyIdBySlug,
        row.target_slug,
        "supply_relations",
      ),
      evidence_type: row.evidence_type,
    })),
  ];

  const existingEvidenceKeys = await fetchRelationEvidenceKeys(client);
  const missingEvidenceRows = evidenceRows.filter((row) => {
    const target =
      row.industry_node_id ?? row.company_node_role_id ?? row.supply_relation_id;
    return !existingEvidenceKeys.has(`${row.source_id}\u0000${target}`);
  });
  if (missingEvidenceRows.length) {
    await insertRows(client, "relation_evidence", missingEvidenceRows);
  }

  await upsertRows(
    client,
    "subnode_company_coverages",
    parsedSnapshot.subnodeCompanyCoverages.map((coverage) => ({
      slug: coverage.id,
      stage_id: coverage.stageId,
      group_id: coverage.groupId,
      subnode_id: coverage.subnodeId,
      company_id: requireUuid(companyIdBySlug, coverage.companyId, "companies"),
      rank: coverage.rank,
      priority: coverage.priority,
      relevance: coverage.relevance,
      evidence_level: coverage.evidenceLevel,
      role: coverage.role,
      market_share_note: coverage.marketShareNote ?? null,
      market_cap_note: coverage.marketCapNote ?? null,
      published: true,
    })),
    seedSyncConflictKeys.subnodeCompanyCoverages,
  );

  const coverageIdBySlug = await fetchSlugMap(client, "subnode_company_coverages");
  await upsertRows(
    client,
    "subnode_company_coverage_sources",
    coverageSourceRows(parsedSnapshot).map((row) => ({
      coverage_id: requireUuid(
        coverageIdBySlug,
        row.coverage_slug,
        "subnode_company_coverages",
      ),
      source_id: requireUuid(sourceIdBySlug, row.source_slug, "sources"),
    })),
    seedSyncConflictKeys.subnodeCompanyCoverageSources,
  );

  return { mode: "execute" as const, plan };
};

const main = async () => {
  const execute = process.argv.includes("--execute");
  const result = await syncSupabaseSeed({ execute });
  process.stdout.write(
    `${execute ? "Supabase seed synced" : "Supabase seed dry-run"}: ${JSON.stringify(
      result.plan.tables,
    )}\n`,
  );
};

if (process.env.VITEST !== "true" && process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
