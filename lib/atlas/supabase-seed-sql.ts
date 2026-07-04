import { atlasSnapshotSchema, type AtlasSnapshot } from "@/lib/atlas/schema";

type SqlValue = string | number | boolean | null | undefined;

type SeedTable = {
  columns: readonly string[];
  types: readonly string[];
  rows: readonly (readonly SqlValue[])[];
};

const sqlLiteral = (value: SqlValue) => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${value.replace(/'/g, "''")}'`;
};

const sqlTextArray = (values: readonly string[]) => {
  if (values.length === 0) return "array[]::text[]";
  return `array[${values.map(sqlLiteral).join(", ")}]::text[]`;
};

const valuesTable = ({ columns, rows, types }: SeedTable) => {
  if (rows.length === 0) {
    const nullColumns = columns.map((column, index) => {
      const type = types[index] ?? "text";
      return `null::${type} as ${column}`;
    });
    return `(select ${nullColumns.join(", ")} where false) as seed`;
  }

  const tuples = rows
    .map((row) => `  (${row.map(sqlLiteral).join(", ")})`)
    .join(",\n");
  return `(values\n${tuples}\n) as seed(${columns.join(", ")})`;
};

const uniqueAliasRows = (snapshot: AtlasSnapshot) => {
  const seen = new Set<string>();
  const rows: [string, string, string, string][] = [];

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
      rows.push([company.id, alias, aliasType, locale]);
    }
  }

  return rows;
};

const nodeEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.nodes.flatMap((node) =>
    node.sourceIds.map((sourceId) => [sourceId, node.id] as const),
  );

const roleEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.companyNodeRoles.flatMap((role) =>
    role.sourceIds.map((sourceId) => [sourceId, role.id] as const),
  );

const supplyEvidenceRows = (snapshot: AtlasSnapshot) =>
  snapshot.supplyRelations.flatMap((relation) =>
    relation.evidenceSourceIds.map((sourceId) => [sourceId, relation.id] as const),
  );

const coverageSourceRows = (snapshot: AtlasSnapshot) =>
  snapshot.subnodeCompanyCoverages.flatMap((coverage) =>
    coverage.sourceIds.map((sourceId) => [coverage.id, sourceId] as const),
  );

const joinSections = (sections: readonly string[]) =>
  `${sections.map((section) => section.trim()).join("\n\n")}\n`;

export const buildSupabaseSeedSql = (input: AtlasSnapshot): string => {
  const snapshot = atlasSnapshotSchema.parse(input);

  return joinSections([
    "begin;",
    `insert into public.sources (
  slug,
  title,
  url,
  publisher,
  published_at,
  checked_at,
  published
)
select
  seed.slug,
  seed.title,
  seed.url,
  seed.publisher,
  seed.published_at::date,
  seed.checked_at::timestamptz,
  true
from ${valuesTable({
      columns: ["slug", "title", "url", "publisher", "published_at", "checked_at"],
      types: ["text", "text", "text", "text", "date", "timestamptz"],
      rows: snapshot.sources.map((source) => [
        source.id,
        source.title,
        source.url,
        source.publisher,
        source.publishedAt,
        source.checkedAt,
      ]),
    })}
on conflict (slug) do update set
  title = excluded.title,
  url = excluded.url,
  publisher = excluded.publisher,
  published_at = excluded.published_at,
  checked_at = excluded.checked_at,
  published = true,
  updated_at = now();`,
    `insert into public.companies (
  slug,
  name,
  ticker,
  exchange,
  market,
  currency,
  provider,
  provider_symbol,
  published
)
select
  seed.slug,
  seed.name,
  seed.ticker,
  seed.exchange,
  seed.market,
  seed.currency,
  'static_seed',
  seed.slug,
  true
from ${valuesTable({
      columns: ["slug", "name", "ticker", "exchange", "market", "currency"],
      types: ["text", "text", "text", "text", "text", "text"],
      rows: snapshot.companies.map((company) => [
        company.id,
        company.name,
        company.ticker,
        company.exchange,
        company.market,
        company.currency,
      ]),
    })}
on conflict (slug) do update set
  name = excluded.name,
  ticker = excluded.ticker,
  exchange = excluded.exchange,
  market = excluded.market,
  currency = excluded.currency,
  provider = excluded.provider,
  provider_symbol = excluded.provider_symbol,
  published = true,
  updated_at = now();`,
    `insert into public.company_aliases (
  company_id,
  alias,
  alias_type,
  locale,
  published
)
select
  company.id,
  seed.alias,
  seed.alias_type,
  seed.locale,
  true
from ${valuesTable({
      columns: ["company_slug", "alias", "alias_type", "locale"],
      types: ["text", "text", "text", "text"],
      rows: uniqueAliasRows(snapshot),
    })}
join public.companies company on company.slug = seed.company_slug
on conflict (company_id, alias, alias_type) do update set
  locale = excluded.locale,
  published = true,
  updated_at = now();`,
    `insert into public.industry_nodes (
  slug,
  layer,
  kind,
  name,
  english_name,
  summary,
  technology,
  barriers,
  drivers,
  risks,
  published
)
select
  seed.slug,
  seed.layer,
  seed.kind,
  seed.name,
  seed.english_name,
  seed.summary,
  seed.technology,
  seed.barriers,
  seed.drivers,
  seed.risks,
  true
from (values
${snapshot.nodes
  .map(
    (node) =>
      `  (${[
        sqlLiteral(node.id),
        sqlLiteral(node.layer),
        sqlLiteral(node.kind),
        sqlLiteral(node.name),
        sqlLiteral(node.englishName),
        sqlLiteral(node.summary),
        sqlLiteral(node.technology),
        sqlTextArray(node.barriers),
        sqlTextArray(node.drivers),
        sqlTextArray(node.risks),
      ].join(", ")})`,
  )
  .join(",\n")}
) as seed(slug, layer, kind, name, english_name, summary, technology, barriers, drivers, risks)
on conflict (slug) do update set
  layer = excluded.layer,
  kind = excluded.kind,
  name = excluded.name,
  english_name = excluded.english_name,
  summary = excluded.summary,
  technology = excluded.technology,
  barriers = excluded.barriers,
  drivers = excluded.drivers,
  risks = excluded.risks,
  published = true,
  updated_at = now();`,
    `-- idempotent via company_node_roles_slug_unique_idx
insert into public.company_node_roles (
  slug,
  company_id,
  node_id,
  role,
  product,
  published
)
select
  seed.slug,
  company.id,
  node.id,
  seed.role,
  seed.product,
  true
from ${valuesTable({
      columns: ["slug", "company_slug", "node_slug", "role", "product"],
      types: ["text", "text", "text", "text", "text"],
      rows: snapshot.companyNodeRoles.map((role) => [
        role.id,
        role.companyId,
        role.nodeId,
        role.role,
        role.product,
      ]),
    })}
join public.companies company on company.slug = seed.company_slug
join public.industry_nodes node on node.slug = seed.node_slug
on conflict (slug) do update set
  company_id = excluded.company_id,
  node_id = excluded.node_id,
  role = excluded.role,
  product = excluded.product,
  published = true,
  updated_at = now();`,
    `insert into public.industry_edges (
  slug,
  from_node_id,
  to_node_id,
  type,
  published
)
select
  seed.slug,
  from_node.id,
  to_node.id,
  seed.type,
  true
from ${valuesTable({
      columns: ["slug", "from_node_slug", "to_node_slug", "type"],
      types: ["text", "text", "text", "text"],
      rows: snapshot.industryEdges.map((edge) => [
        edge.id,
        edge.from,
        edge.to,
        edge.type,
      ]),
    })}
join public.industry_nodes from_node on from_node.slug = seed.from_node_slug
join public.industry_nodes to_node on to_node.slug = seed.to_node_slug
on conflict (slug) do update set
  from_node_id = excluded.from_node_id,
  to_node_id = excluded.to_node_id,
  type = excluded.type,
  published = true,
  updated_at = now();`,
    `-- idempotent via supply_relations_slug_unique_idx
insert into public.supply_relations (
  slug,
  supplier_company_id,
  customer_company_id,
  node_id,
  product,
  status,
  announced_at,
  published
)
select
  seed.slug,
  supplier.id,
  customer.id,
  node.id,
  seed.product,
  seed.status,
  seed.announced_at::date,
  true
from ${valuesTable({
      columns: [
        "slug",
        "supplier_company_slug",
        "customer_company_slug",
        "node_slug",
        "product",
        "status",
        "announced_at",
      ],
      types: ["text", "text", "text", "text", "text", "text", "date"],
      rows: snapshot.supplyRelations.map((relation) => [
        relation.id,
        relation.supplierId,
        relation.customerId,
        relation.nodeId,
        relation.product,
        relation.status,
        relation.announcedAt,
      ]),
    })}
join public.companies supplier on supplier.slug = seed.supplier_company_slug
join public.companies customer on customer.slug = seed.customer_company_slug
join public.industry_nodes node on node.slug = seed.node_slug
on conflict (slug) do update set
  supplier_company_id = excluded.supplier_company_id,
  customer_company_id = excluded.customer_company_id,
  node_id = excluded.node_id,
  product = excluded.product,
  status = excluded.status,
  announced_at = excluded.announced_at,
  published = true,
  updated_at = now();`,
    `insert into public.relation_evidence (
  source_id,
  industry_node_id,
  evidence_type
)
select
  source.id,
  node.id,
  'node'
from ${valuesTable({
      columns: ["source_slug", "node_slug"],
      types: ["text", "text"],
      rows: nodeEvidenceRows(snapshot),
    })}
join public.sources source on source.slug = seed.source_slug
join public.industry_nodes node on node.slug = seed.node_slug
where not exists (
  select 1
  from public.relation_evidence existing
  where existing.source_id = source.id
    and existing.industry_node_id = node.id
);`,
    `insert into public.relation_evidence (
  source_id,
  company_node_role_id,
  evidence_type
)
select
  source.id,
  role.id,
  'company_node_role'
from ${valuesTable({
      columns: ["source_slug", "role_slug"],
      types: ["text", "text"],
      rows: roleEvidenceRows(snapshot),
    })}
join public.sources source on source.slug = seed.source_slug
join public.company_node_roles role on role.slug = seed.role_slug
where not exists (
  select 1
  from public.relation_evidence existing
  where existing.source_id = source.id
    and existing.company_node_role_id = role.id
);`,
    `insert into public.relation_evidence (
  source_id,
  supply_relation_id,
  evidence_type
)
select
  source.id,
  relation.id,
  'supply_relation'
from ${valuesTable({
      columns: ["source_slug", "supply_relation_slug"],
      types: ["text", "text"],
      rows: supplyEvidenceRows(snapshot),
    })}
join public.sources source on source.slug = seed.source_slug
join public.supply_relations relation on relation.slug = seed.supply_relation_slug
where not exists (
  select 1
  from public.relation_evidence existing
  where existing.source_id = source.id
    and existing.supply_relation_id = relation.id
);`,
    `insert into public.market_snapshots (
  company_id,
  provider,
  price,
  change_pct,
  currency,
  traded_at,
  fetched_at,
  delay_minutes,
  ttm_eps,
  ttm_pe,
  market_cap,
  pb,
  ps,
  turnover,
  freshness_source,
  cached_at,
  error
)
select
  company.id,
  seed.provider,
  seed.price,
  seed.change_pct,
  seed.currency,
  seed.traded_at,
  seed.fetched_at,
  seed.delay_minutes,
  seed.ttm_eps,
  seed.ttm_pe,
  seed.market_cap,
  seed.pb,
  seed.ps,
  seed.turnover,
  seed.freshness_source,
  seed.cached_at,
  seed.error
from ${valuesTable({
      columns: [
        "company_slug",
        "provider",
        "price",
        "change_pct",
        "currency",
        "traded_at",
        "fetched_at",
        "delay_minutes",
        "ttm_eps",
        "ttm_pe",
        "market_cap",
        "pb",
        "ps",
        "turnover",
        "freshness_source",
        "cached_at",
        "error",
      ],
      types: [
        "text",
        "text",
        "numeric",
        "numeric",
        "text",
        "timestamptz",
        "timestamptz",
        "integer",
        "numeric",
        "numeric",
        "numeric",
        "numeric",
        "numeric",
        "numeric",
        "text",
        "timestamptz",
        "text",
      ],
      rows: snapshot.marketSnapshots.map((snapshotRow) => [
        snapshotRow.companyId,
        "static_seed",
        snapshotRow.price,
        snapshotRow.changePct,
        snapshotRow.currency,
        snapshotRow.tradedAt,
        snapshotRow.fetchedAt,
        snapshotRow.delayMinutes,
        snapshotRow.ttmEps,
        snapshotRow.ttmPe,
        snapshotRow.marketCap,
        snapshotRow.pb,
        snapshotRow.ps,
        snapshotRow.turnover,
        snapshotRow.freshnessSource,
        snapshotRow.cachedAt,
        snapshotRow.error,
      ]),
    })}
join public.companies company on company.slug = seed.company_slug
on conflict (company_id, provider, traded_at) do update set
  price = excluded.price,
  change_pct = excluded.change_pct,
  currency = excluded.currency,
  fetched_at = excluded.fetched_at,
  delay_minutes = excluded.delay_minutes,
  ttm_eps = excluded.ttm_eps,
  ttm_pe = excluded.ttm_pe,
  market_cap = excluded.market_cap,
  pb = excluded.pb,
  ps = excluded.ps,
  turnover = excluded.turnover,
  freshness_source = excluded.freshness_source,
  cached_at = excluded.cached_at,
  error = excluded.error;`,
    `insert into public.subnode_company_coverages (
  slug,
  stage_id,
  group_id,
  subnode_id,
  company_id,
  rank,
  priority,
  relevance,
  evidence_level,
  role,
  market_share_note,
  market_cap_note,
  published
)
select
  seed.slug,
  seed.stage_id,
  seed.group_id,
  seed.subnode_id,
  company.id,
  seed.rank,
  seed.priority,
  seed.relevance,
  seed.evidence_level,
  seed.role,
  seed.market_share_note,
  seed.market_cap_note,
  true
from ${valuesTable({
      columns: [
        "slug",
        "stage_id",
        "group_id",
        "subnode_id",
        "company_slug",
        "rank",
        "priority",
        "relevance",
        "evidence_level",
        "role",
        "market_share_note",
        "market_cap_note",
      ],
      types: [
        "text",
        "text",
        "text",
        "text",
        "text",
        "integer",
        "text",
        "text",
        "text",
        "text",
        "text",
        "text",
      ],
      rows: snapshot.subnodeCompanyCoverages.map((coverage) => [
        coverage.id,
        coverage.stageId,
        coverage.groupId,
        coverage.subnodeId,
        coverage.companyId,
        coverage.rank,
        coverage.priority,
        coverage.relevance,
        coverage.evidenceLevel,
        coverage.role,
        coverage.marketShareNote,
        coverage.marketCapNote,
      ]),
    })}
join public.companies company on company.slug = seed.company_slug
on conflict (stage_id, group_id, subnode_id, rank) do update set
  slug = excluded.slug,
  company_id = excluded.company_id,
  priority = excluded.priority,
  relevance = excluded.relevance,
  evidence_level = excluded.evidence_level,
  role = excluded.role,
  market_share_note = excluded.market_share_note,
  market_cap_note = excluded.market_cap_note,
  published = true,
  updated_at = now();`,
    `insert into public.subnode_company_coverage_sources (
  coverage_id,
  source_id
)
select
  coverage.id,
  source.id
from ${valuesTable({
      columns: ["coverage_slug", "source_slug"],
      types: ["text", "text"],
      rows: coverageSourceRows(snapshot),
    })}
join public.subnode_company_coverages coverage on coverage.slug = seed.coverage_slug
join public.sources source on source.slug = seed.source_slug
on conflict (coverage_id, source_id) do nothing;`,
    "commit;",
  ]);
};
