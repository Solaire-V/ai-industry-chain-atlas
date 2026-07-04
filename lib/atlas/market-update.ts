import { z } from "zod";

import type { AtlasCompany } from "@/lib/atlas/schema";

const finiteNonnegative = z.number().finite().nonnegative();
const nullableFinite = z.number().finite().nullable().optional();

const marketQuoteSchema = z.object({
  companyId: z.string().trim().min(1),
  price: finiteNonnegative,
  changePct: z.number().finite(),
  currency: z.string().length(3),
  tradedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  delayMinutes: z.number().int().nonnegative(),
  ttmEps: nullableFinite,
  ttmPe: z.number().finite().positive().nullable().optional(),
  freshnessSource: z.enum(["live", "delayed", "close", "cached"]).optional(),
  cachedAt: z.string().datetime().optional(),
  error: z.string().trim().min(1).optional(),
  marketCap: finiteNonnegative.nullable().optional(),
  pb: z.number().finite().positive().nullable().optional(),
  ps: z.number().finite().positive().nullable().optional(),
  turnover: finiteNonnegative.nullable().optional(),
});

export type MarketQuote = z.infer<typeof marketQuoteSchema>;

export interface MarketDataProvider {
  id: string;
  fetchLatest(companies: readonly AtlasCompany[]): Promise<readonly MarketQuote[]>;
}

export interface MarketSnapshotUpsertRow {
  company_id: string;
  provider: string;
  price: number;
  change_pct: number;
  currency: string;
  traded_at: string;
  fetched_at: string;
  delay_minutes: number;
  ttm_eps: number | null;
  ttm_pe: number | null;
  freshness_source: MarketQuote["freshnessSource"] | null;
  cached_at: string | null;
  error: string | null;
  market_cap: number | null;
  pb: number | null;
  ps: number | null;
  turnover: number | null;
}

export interface BuildMarketSnapshotRowsInput {
  providerId: string;
  companyUuidBySlug: ReadonlyMap<string, string>;
  quotes: readonly MarketQuote[];
}

export interface MarketUpdateRunStart {
  jobName: string;
  provider: string;
  startedAt: string;
}

export interface MarketUpdateRunFinish {
  status: "succeeded" | "failed";
  finishedAt: string;
  rowsRead: number;
  rowsWritten: number;
  errorMessage: string | null;
}

export interface MarketUpdateStore {
  startUpdateRun(input: MarketUpdateRunStart): Promise<{ id: string }>;
  resolveCompanyIds(companySlugs: readonly string[]): Promise<ReadonlyMap<string, string>>;
  upsertMarketSnapshots(rows: readonly MarketSnapshotUpsertRow[]): Promise<number>;
  finishUpdateRun(runId: string, input: MarketUpdateRunFinish): Promise<void>;
}

export interface MarketUpdateResult {
  status: "succeeded" | "failed";
  provider: string;
  rowsRead: number;
  rowsWritten: number;
  errorMessage: string | null;
}

export interface RunMarketSnapshotUpdateInput {
  companies: readonly AtlasCompany[];
  provider: MarketDataProvider;
  store: MarketUpdateStore;
  now?: () => Date;
  secretRedactions?: readonly string[];
}

const unique = (values: Iterable<string>) => [...new Set(values)];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const sanitizeUpdateErrorMessage = (
  message: string,
  secretRedactions: readonly string[] = [],
) => {
  let sanitized = message.replace(
    /\b(api[_-]?key|apikey|token|secret|password)=\S+/gi,
    "$1=[redacted]",
  );
  for (const secret of secretRedactions) {
    if (!secret) continue;
    sanitized = sanitized.replace(
      new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(secret)}(?![A-Za-z0-9])`, "g"),
      "[redacted]",
    );
  }
  return sanitized;
};

export const buildMarketSnapshotRows = ({
  providerId,
  companyUuidBySlug,
  quotes,
}: BuildMarketSnapshotRowsInput): MarketSnapshotUpsertRow[] =>
  quotes.map((quote, index) => {
    const parsed = marketQuoteSchema.safeParse(quote);
    if (!parsed.success) {
      throw new Error(
        `Invalid market quote at index ${index}: ${parsed.error.issues[0]?.message ?? "unknown error"}`,
      );
    }

    const companyUuid = companyUuidBySlug.get(parsed.data.companyId);
    if (!companyUuid) {
      throw new Error(`Unknown market quote company: ${parsed.data.companyId}`);
    }

    return {
      company_id: companyUuid,
      provider: providerId,
      price: parsed.data.price,
      change_pct: parsed.data.changePct,
      currency: parsed.data.currency,
      traded_at: parsed.data.tradedAt,
      fetched_at: parsed.data.fetchedAt,
      delay_minutes: parsed.data.delayMinutes,
      ttm_eps: parsed.data.ttmEps ?? null,
      ttm_pe: parsed.data.ttmPe ?? null,
      freshness_source: parsed.data.freshnessSource ?? null,
      cached_at: parsed.data.cachedAt ?? null,
      error: parsed.data.error ?? null,
      market_cap: parsed.data.marketCap ?? null,
      pb: parsed.data.pb ?? null,
      ps: parsed.data.ps ?? null,
      turnover: parsed.data.turnover ?? null,
    };
  });

export const runMarketSnapshotUpdate = async ({
  companies,
  provider,
  store,
  now = () => new Date(),
  secretRedactions = [],
}: RunMarketSnapshotUpdateInput): Promise<MarketUpdateResult> => {
  const run = await store.startUpdateRun({
    jobName: "market_snapshot_daily",
    provider: provider.id,
    startedAt: now().toISOString(),
  });
  let rowsRead = 0;

  try {
    const quotes = await provider.fetchLatest(companies);
    rowsRead = quotes.length;
    const companyUuidBySlug = await store.resolveCompanyIds(
      unique(quotes.map(({ companyId }) => companyId)),
    );
    const rows = buildMarketSnapshotRows({
      providerId: provider.id,
      companyUuidBySlug,
      quotes,
    });
    const rowsWritten = await store.upsertMarketSnapshots(rows);
    const result: MarketUpdateResult = {
      status: "succeeded",
      provider: provider.id,
      rowsRead,
      rowsWritten,
      errorMessage: null,
    };
    await store.finishUpdateRun(run.id, {
      status: "succeeded",
      finishedAt: now().toISOString(),
      rowsRead,
      rowsWritten,
      errorMessage: null,
    });
    return result;
  } catch (error) {
    const sanitized = sanitizeUpdateErrorMessage(
      errorMessage(error),
      secretRedactions,
    );
    await store.finishUpdateRun(run.id, {
      status: "failed",
      finishedAt: now().toISOString(),
      rowsRead,
      rowsWritten: 0,
      errorMessage: sanitized,
    });
    return {
      status: "failed",
      provider: provider.id,
      rowsRead,
      rowsWritten: 0,
      errorMessage: sanitized,
    };
  }
};

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseMarketUpdateClient {
  from(table: string): {
    insert(values: unknown): {
      select(columns: string): {
        single(): PromiseLike<SupabaseResult<{ id: string }>>;
      };
    };
    select(columns: string): {
      in(column: string, values: readonly string[]): PromiseLike<SupabaseResult<readonly {
        id: string;
        slug: string;
      }[]>>;
    };
    upsert(
      values: readonly MarketSnapshotUpsertRow[],
      options: { onConflict: string },
    ): PromiseLike<SupabaseResult<unknown>>;
    update(values: unknown): {
      eq(column: string, value: string): PromiseLike<SupabaseResult<unknown>>;
    };
  };
}

const throwIfSupabaseError = (table: string, error: { message: string } | null) => {
  if (error) throw new Error(`Supabase ${table} write failed: ${error.message}`);
};

export const createSupabaseMarketUpdateStore = (
  client: SupabaseMarketUpdateClient,
): MarketUpdateStore => ({
  async startUpdateRun(input) {
    const { data, error } = await client
      .from("update_runs")
      .insert({
        job_name: input.jobName,
        provider: input.provider,
        status: "running",
        started_at: input.startedAt,
      })
      .select("id")
      .single();
    throwIfSupabaseError("update_runs", error);
    if (!data?.id) throw new Error("Supabase update_runs insert returned no id");
    return { id: data.id };
  },
  async resolveCompanyIds(companySlugs) {
    if (companySlugs.length === 0) return new Map();
    const { data, error } = await client
      .from("companies")
      .select("id,slug")
      .in("slug", companySlugs);
    throwIfSupabaseError("companies", error);
    return new Map((data ?? []).map(({ slug, id }) => [slug, id]));
  },
  async upsertMarketSnapshots(rows) {
    if (rows.length === 0) return 0;
    const { error } = await client
      .from("market_snapshots")
      .upsert(rows, { onConflict: "company_id,provider,traded_at" });
    throwIfSupabaseError("market_snapshots", error);
    return rows.length;
  },
  async finishUpdateRun(runId, input) {
    const { error } = await client
      .from("update_runs")
      .update({
        status: input.status,
        finished_at: input.finishedAt,
        rows_read: input.rowsRead,
        rows_written: input.rowsWritten,
        error_message: input.errorMessage,
      })
      .eq("id", runId);
    throwIfSupabaseError("update_runs", error);
  },
});
