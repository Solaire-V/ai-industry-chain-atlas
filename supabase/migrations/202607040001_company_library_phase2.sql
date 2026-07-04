create table if not exists public.company_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  alias text not null,
  alias_type text not null default 'display' check (alias_type in ('display', 'search', 'former_name', 'english', 'ticker')),
  locale text not null default 'zh-CN',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, alias, alias_type)
);

create table if not exists public.subnode_company_coverages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  stage_id text not null check (stage_id in (
    'materials',
    'equipment',
    'ai-chip',
    'hbm-memory',
    'advanced-packaging',
    'board-system',
    'optical-interconnect',
    'server-network',
    'compute-applications'
  )),
  group_id text not null,
  subnode_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  rank integer not null check (rank > 0),
  priority text not null check (priority in ('leader', 'important', 'supplementary', 'watch')),
  relevance text not null check (relevance in ('direct', 'adjacent', 'indirect')),
  evidence_level char(1) not null check (evidence_level in ('A', 'B', 'C', 'D')),
  role text not null,
  market_share_note text,
  market_cap_note text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, group_id, subnode_id, company_id),
  unique (stage_id, group_id, subnode_id, rank),
  check (priority <> 'leader' or evidence_level <> 'D'),
  check (priority <> 'leader' or relevance <> 'indirect')
);

create table if not exists public.subnode_company_coverage_sources (
  coverage_id uuid not null references public.subnode_company_coverages(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (coverage_id, source_id)
);

create table if not exists public.update_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  provider text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_read integer not null default 0 check (rows_read >= 0),
  rows_written integer not null default 0 check (rows_written >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at)
);

alter table public.market_snapshots add column if not exists market_cap numeric(24, 2) check (market_cap is null or market_cap >= 0);
alter table public.market_snapshots add column if not exists pb numeric(20, 6) check (pb is null or pb > 0);
alter table public.market_snapshots add column if not exists ps numeric(20, 6) check (ps is null or ps > 0);
alter table public.market_snapshots add column if not exists turnover numeric(24, 2) check (turnover is null or turnover >= 0);
alter table public.market_snapshots add column if not exists source_id uuid references public.sources(id) on delete set null;

alter table public.company_node_roles add column if not exists slug text;
alter table public.supply_relations add column if not exists slug text;

create index if not exists company_aliases_company_idx
  on public.company_aliases (company_id)
  where published;

create index if not exists company_aliases_alias_idx
  on public.company_aliases (lower(alias))
  where published;

create index if not exists subnode_company_coverages_subnode_rank_idx
  on public.subnode_company_coverages (stage_id, group_id, subnode_id, rank)
  where published;

create index if not exists subnode_company_coverages_company_idx
  on public.subnode_company_coverages (company_id, rank)
  where published;

create index if not exists subnode_company_coverage_sources_source_idx
  on public.subnode_company_coverage_sources (source_id);

create index if not exists update_runs_job_recency_idx
  on public.update_runs (job_name, started_at desc);

create index if not exists update_runs_status_idx
  on public.update_runs (status, started_at desc);

create index if not exists market_snapshots_source_idx
  on public.market_snapshots (source_id);

create unique index if not exists company_node_roles_slug_unique_idx
  on public.company_node_roles (slug);

create unique index if not exists supply_relations_slug_unique_idx
  on public.supply_relations (slug);

alter table public.company_aliases enable row level security;
alter table public.subnode_company_coverages enable row level security;
alter table public.subnode_company_coverage_sources enable row level security;
alter table public.update_runs enable row level security;

drop policy if exists "Public read published company aliases" on public.company_aliases;
create policy "Public read published company aliases"
  on public.company_aliases for select to anon
  using (
    published
    and exists (
      select 1
      from public.companies company
      where company.id = company_id
        and company.published
    )
  );

drop policy if exists "Public read published subnode company coverages" on public.subnode_company_coverages;
create policy "Public read published subnode company coverages"
  on public.subnode_company_coverages for select to anon
  using (
    published
    and exists (
      select 1
      from public.companies company
      where company.id = company_id
        and company.published
    )
  );

drop policy if exists "Public read published coverage sources" on public.subnode_company_coverage_sources;
create policy "Public read published coverage sources"
  on public.subnode_company_coverage_sources for select to anon
  using (
    exists (
      select 1
      from public.subnode_company_coverages coverage
      where coverage.id = coverage_id
        and coverage.published
    )
    and exists (
      select 1
      from public.sources source
      where source.id = source_id
        and source.published
    )
  );

drop policy if exists "Public read successful update runs" on public.update_runs;
create policy "Public read successful update runs"
  on public.update_runs for select to anon
  using (
    published
    and status in ('succeeded', 'skipped')
    and error_message is null
  );
