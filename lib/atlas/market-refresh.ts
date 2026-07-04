import { createClient } from "@supabase/supabase-js";

import {
  createSupabaseMarketUpdateStore,
  runMarketSnapshotUpdate,
  sanitizeUpdateErrorMessage,
  type MarketUpdateResult,
} from "@/lib/atlas/market-update";
import { createHithinkFuyaoMarketDataProvider } from "@/lib/atlas/providers/hithink-fuyao";
import type { AtlasRepository } from "@/lib/atlas/repository";
import type { AtlasCompany } from "@/lib/atlas/schema";

export interface MarketRefreshEnv {
  [key: string]: string | undefined;
  ATLAS_CRON_SECRET?: string;
  CRON_SECRET?: string;
  MARKET_DATA_PROVIDER?: string;
  HITHINK_FUYAO_API_KEY?: string;
  FUYAO_TOKEN?: string;
  API_KEY?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface HandleMarketRefreshInput {
  request: Request;
  repository: AtlasRepository;
  env?: MarketRefreshEnv;
  dependencies?: Partial<MarketRefreshDependencies>;
}

type MarketRefreshTrigger = "manual" | "vercel-cron";
type SupabaseMarketUpdateClient = Parameters<typeof createSupabaseMarketUpdateStore>[0];

interface RefreshContext {
  provider: string;
  trigger: MarketRefreshTrigger;
  cronSchedule?: string;
  companyCount: number;
}

interface RefreshState extends RefreshContext {
  companies: readonly AtlasCompany[];
}

interface SupabaseUpdateConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

export interface MarketRefreshDependencies {
  createHithinkFuyaoMarketDataProvider: typeof createHithinkFuyaoMarketDataProvider;
  createSupabaseMarketUpdateClient: (
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => SupabaseMarketUpdateClient;
  createMarketUpdateStore: typeof createSupabaseMarketUpdateStore;
  runMarketUpdate: typeof runMarketSnapshotUpdate;
}

const configuredRefreshSecrets = (env: MarketRefreshEnv) =>
  [...new Set([env.ATLAS_CRON_SECRET, env.CRON_SECRET])]
    .map((secret) => (secret ?? "").trim())
    .filter((secret) => secret.length > 0);

const selectedMarketDataProvider = (env: MarketRefreshEnv) =>
  ((env.MARKET_DATA_PROVIDER ?? "disabled").trim().toLowerCase() || "disabled")
    .replace(/^fuyao$/, "hithink-fuyao");

const hithinkFuyaoApiKey = (env: MarketRefreshEnv) =>
  (env.HITHINK_FUYAO_API_KEY ?? env.FUYAO_TOKEN ?? env.API_KEY ?? "").trim();

const supabaseUpdateConfig = (env: MarketRefreshEnv) => {
  const supabaseUrl = (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    const missingEnv = [];
    if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
    if (!serviceRoleKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    return { missingEnv };
  }

  return { supabaseUrl, serviceRoleKey, missingEnv: [] };
};

const createDefaultSupabaseMarketUpdateClient = (
  supabaseUrl: string,
  serviceRoleKey: string,
) => {
  const createSupabaseClient = createClient as unknown as (
    supabaseUrl: string,
    serviceRoleKey: string,
    options: {
      auth: {
        autoRefreshToken: boolean;
        persistSession: boolean;
      };
    },
  ) => unknown;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseMarketUpdateClient;
};

const defaultDependencies: MarketRefreshDependencies = {
  createHithinkFuyaoMarketDataProvider,
  createSupabaseMarketUpdateClient: createDefaultSupabaseMarketUpdateClient,
  createMarketUpdateStore: createSupabaseMarketUpdateStore,
  runMarketUpdate: runMarketSnapshotUpdate,
};

const readBearerToken = (authorization: string | null) => {
  if (!authorization) return null;
  const match = authorization.trim().match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const sameToken = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const json = (body: unknown, init?: ResponseInit) =>
  Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });

const detectTrigger = (request: Request): MarketRefreshTrigger => {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (
    userAgent.includes("vercel-cron/") ||
    request.headers.has("x-vercel-cron-schedule")
  ) {
    return "vercel-cron";
  }
  return "manual";
};

const dryRunRequested = (request: Request) => {
  const value = new URL(request.url).searchParams.get("dryRun");
  return value === "1" || value === "true";
};

const baseContext = async (
  request: Request,
  repository: AtlasRepository,
  env: MarketRefreshEnv,
): Promise<RefreshState> => {
  const snapshot = await repository.getSnapshot();
  const cronSchedule = request.headers.get("x-vercel-cron-schedule") ?? undefined;

  return {
    provider: selectedMarketDataProvider(env),
    trigger: detectTrigger(request),
    cronSchedule,
    companyCount: snapshot.companies.length,
    companies: snapshot.companies,
  };
};

const publicContext = ({ companies: _companies, ...context }: RefreshState) =>
  context;

const unknownErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const missingSupabaseStoreResponse = (
  context: RefreshState,
  missingEnv: readonly string[],
) =>
  json(
    {
      status: "skipped",
      code: "market_update_store_not_configured",
      ...publicContext(context),
      missingEnv,
      acceptedEnv: [
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
      wouldWrite: false,
    },
    { status: 503 },
  );

const marketUpdateResponse = (
  context: RefreshState,
  result: MarketUpdateResult,
) =>
  json(
    {
      status: result.status,
      code: result.status === "succeeded"
        ? "market_update_succeeded"
        : "market_update_failed",
      ...publicContext(context),
      provider: result.provider,
      rowsRead: result.rowsRead,
      rowsWritten: result.rowsWritten,
      errorMessage: result.errorMessage,
    },
    { status: result.status === "succeeded" ? 200 : 502 },
  );

export const methodNotAllowedResponse = (_request: Request) =>
  json(
    {
      error: {
        code: "method_not_allowed",
        message: "Use GET for Vercel Cron or POST for manual refresh.",
      },
    },
    {
      status: 405,
      headers: { Allow: "GET, POST" },
    },
  );

export const handleMarketRefresh = async ({
  request,
  repository,
  env = process.env,
  dependencies = {},
}: HandleMarketRefreshInput) => {
  const deps = { ...defaultDependencies, ...dependencies };
  const refreshSecrets = configuredRefreshSecrets(env);
  if (refreshSecrets.length === 0) {
    return json(
      {
        error: {
          code: "refresh_secret_not_configured",
          message: "Market refresh secret is not configured.",
        },
      },
      { status: 503 },
    );
  }

  const bearerToken = readBearerToken(request.headers.get("authorization"));
  if (
    !bearerToken ||
    !refreshSecrets.some((secret) => sameToken(bearerToken, secret))
  ) {
    return json(
      {
        error: {
          code: "unauthorized",
          message: "Unauthorized market refresh request.",
        },
      },
      { status: 401 },
    );
  }

  const context = await baseContext(request, repository, env);
  if (dryRunRequested(request)) {
    return json({
      status: "dry_run",
      code: "dry_run",
      ...publicContext(context),
      wouldWrite: false,
    });
  }

  if (context.provider === "disabled") {
    return json({
      status: "skipped",
      code: "provider_disabled",
      ...publicContext(context),
      wouldWrite: false,
    });
  }

  if (context.provider === "hithink-fuyao") {
    const apiKey = hithinkFuyaoApiKey(env);
    if (!apiKey) {
      return json(
        {
          status: "skipped",
          code: "provider_not_configured",
          ...publicContext(context),
          missingEnv: ["HITHINK_FUYAO_API_KEY"],
          acceptedEnv: ["HITHINK_FUYAO_API_KEY", "FUYAO_TOKEN", "API_KEY"],
          wouldWrite: false,
        },
        { status: 503 },
      );
    }

    const updateConfig = supabaseUpdateConfig(env);
    if (updateConfig.missingEnv.length > 0) {
      return missingSupabaseStoreResponse(context, updateConfig.missingEnv);
    }

    const provider = deps.createHithinkFuyaoMarketDataProvider({ apiKey });
    const client = deps.createSupabaseMarketUpdateClient(
      (updateConfig as SupabaseUpdateConfig).supabaseUrl,
      (updateConfig as SupabaseUpdateConfig).serviceRoleKey,
    );
    const store = deps.createMarketUpdateStore(client);

    try {
      const result = await deps.runMarketUpdate({
        companies: context.companies,
        provider,
        store,
        secretRedactions: [apiKey],
      });
      return marketUpdateResponse(context, result);
    } catch (error) {
      return marketUpdateResponse(context, {
        status: "failed",
        provider: "hithink-fuyao",
        rowsRead: 0,
        rowsWritten: 0,
        errorMessage: sanitizeUpdateErrorMessage(unknownErrorMessage(error), [
          apiKey,
        ]),
      });
    }
  }

  return json(
    {
      status: "skipped",
      code: "provider_not_implemented",
      ...publicContext(context),
      wouldWrite: false,
    },
    { status: 501 },
  );
};
