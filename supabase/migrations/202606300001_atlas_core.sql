create extension if not exists pgcrypto;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  url text not null check (url ~ '^https?://'),
  publisher text not null,
  published_at date,
  checked_at timestamptz not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  ticker text not null,
  exchange text not null,
  market text not null check (market in ('US', 'CN', 'HK', 'TW', 'KR', 'JP', 'EU', 'PRIVATE')),
  currency char(3) not null,
  provider text not null default 'manual',
  provider_symbol text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_symbol)
);

create table public.industry_nodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  layer text not null check (layer in ('materials', 'manufacturing', 'chips', 'interconnect', 'infrastructure', 'platform', 'applications')),
  kind text not null check (kind in ('material', 'equipment', 'component', 'system', 'software', 'application')),
  name text not null,
  english_name text,
  summary text not null,
  technology text not null,
  barriers text[] not null default '{}',
  drivers text[] not null default '{}',
  risks text[] not null default '{}',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(barriers) >= 1),
  check (cardinality(drivers) >= 1),
  check (cardinality(risks) >= 1)
);

create table public.company_node_roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  node_id uuid not null references public.industry_nodes(id) on delete cascade,
  role text not null,
  product text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index company_node_roles_unique_product_idx
  on public.company_node_roles (company_id, node_id, role, coalesce(product, ''));

create table public.industry_edges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  from_node_id uuid not null references public.industry_nodes(id) on delete cascade,
  to_node_id uuid not null references public.industry_nodes(id) on delete cascade,
  type text not null check (type in ('supply', 'integrate', 'deploy')),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_node_id, to_node_id, type)
);

create table public.supply_relations (
  id uuid primary key default gen_random_uuid(),
  supplier_company_id uuid not null references public.companies(id) on delete restrict,
  customer_company_id uuid not null references public.companies(id) on delete restrict,
  node_id uuid not null references public.industry_nodes(id) on delete restrict,
  product text not null,
  status text not null check (status in ('company_confirmed', 'counterparty_confirmed', 'regulatory_disclosure', 'multi_source_report', 'market_speculation')),
  announced_at date,
  valid_from date,
  valid_to date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.relation_evidence (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  industry_node_id uuid references public.industry_nodes(id) on delete cascade,
  company_node_role_id uuid references public.company_node_roles(id) on delete cascade,
  supply_relation_id uuid references public.supply_relations(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('node', 'company_node_role', 'supply_relation')),
  created_at timestamptz not null default now(),
  check (
    num_nonnulls(industry_node_id, company_node_role_id, supply_relation_id) = 1
  ),
  check (
    (evidence_type = 'node' and industry_node_id is not null)
    or (evidence_type = 'company_node_role' and company_node_role_id is not null)
    or (evidence_type = 'supply_relation' and supply_relation_id is not null)
  )
);

create unique index relation_evidence_unique_source_idx
  on public.relation_evidence (
    source_id,
    coalesce(industry_node_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(company_node_role_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(supply_relation_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  price numeric(20, 6) not null check (price >= 0),
  change_pct numeric(12, 6) not null,
  currency char(3) not null,
  traded_at timestamptz not null,
  fetched_at timestamptz not null,
  delay_minutes integer not null check (delay_minutes >= 0),
  ttm_eps numeric(20, 6),
  ttm_pe numeric(20, 6) check (ttm_pe is null or ttm_pe > 0),
  freshness_source text check (freshness_source in ('live', 'delayed', 'close', 'cached')),
  cached_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (company_id, provider, traded_at),
  check (freshness_source <> 'live' or (delay_minutes = 0 and cached_at is null)),
  check (freshness_source <> 'delayed' or (delay_minutes > 0 and cached_at is null)),
  check (freshness_source <> 'cached' or cached_at is not null)
);

create table public.fundamental_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  metric_date date not null,
  currency char(3) not null,
  ttm_eps numeric(20, 6),
  ttm_pe numeric(20, 6) check (ttm_pe is null or ttm_pe > 0),
  market_cap numeric(24, 2) check (market_cap is null or market_cap >= 0),
  revenue_ttm numeric(24, 2),
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (company_id, provider, metric_date)
);

create index industry_nodes_layer_idx on public.industry_nodes (layer) where published;
create index companies_ticker_idx on public.companies (market, ticker) where published;
create index company_node_roles_company_idx on public.company_node_roles (company_id);
create index company_node_roles_node_idx on public.company_node_roles (node_id);
create index industry_edges_from_node_idx on public.industry_edges (from_node_id);
create index industry_edges_to_node_idx on public.industry_edges (to_node_id);
create index supply_relations_supplier_idx on public.supply_relations (supplier_company_id);
create index supply_relations_customer_idx on public.supply_relations (customer_company_id);
create index supply_relations_node_idx on public.supply_relations (node_id);
create index market_snapshots_company_recency_idx on public.market_snapshots (company_id, traded_at desc);
create index fundamental_snapshots_company_recency_idx on public.fundamental_snapshots (company_id, metric_date desc);
create index relation_evidence_source_idx on public.relation_evidence (source_id);
create index relation_evidence_supply_relation_idx on public.relation_evidence (supply_relation_id);

alter table public.sources enable row level security;
alter table public.companies enable row level security;
alter table public.industry_nodes enable row level security;
alter table public.company_node_roles enable row level security;
alter table public.industry_edges enable row level security;
alter table public.supply_relations enable row level security;
alter table public.relation_evidence enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.fundamental_snapshots enable row level security;

create policy "Public read published sources"
  on public.sources for select to anon using (published);

create policy "Public read published companies"
  on public.companies for select to anon using (published);

create policy "Public read published industry nodes"
  on public.industry_nodes for select to anon using (published);

create policy "Public read published company node roles"
  on public.company_node_roles for select to anon using (published);

create policy "Public read published industry edges"
  on public.industry_edges for select to anon using (published);

create policy "Public read confirmed supply relations"
  on public.supply_relations for select to anon
  using (published and status <> 'market_speculation');

create policy "Public read non speculative evidence"
  on public.relation_evidence for select to anon
  using (
    exists (
      select 1
      from public.industry_nodes node
      where node.id = industry_node_id
        and node.published
    )
    or exists (
      select 1
      from public.company_node_roles role
      where role.id = company_node_role_id
        and role.published
    )
    or exists (
      select 1
      from public.supply_relations relation
      where relation.id = supply_relation_id
        and relation.published
        and relation.status <> 'market_speculation'
    )
  );

create policy "Public read market snapshots"
  on public.market_snapshots for select to anon
  using (
    exists (
      select 1
      from public.companies company
      where company.id = company_id and company.published
    )
  );

create policy "Public read fundamental snapshots"
  on public.fundamental_snapshots for select to anon
  using (
    exists (
      select 1
      from public.companies company
      where company.id = company_id and company.published
    )
  );
