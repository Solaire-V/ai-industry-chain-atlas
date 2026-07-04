import type { AtlasRepository } from "@/lib/atlas/repository";

export interface MarketRefreshEnv {
  [key: string]: string | undefined;
  ATLAS_CRON_SECRET?: string;
  CRON_SECRET?: string;
  MARKET_DATA_PROVIDER?: string;
  HITHINK_FUYAO_API_KEY?: string;
  FUYAO_TOKEN?: string;
  API_KEY?: string;
}

export interface HandleMarketRefreshInput {
  request: Request;
  repository: AtlasRepository;
  env?: MarketRefreshEnv;
}

type MarketRefreshTrigger = "manual" | "vercel-cron";

interface RefreshContext {
  provider: string;
  trigger: MarketRefreshTrigger;
  cronSchedule?: string;
  companyCount: number;
}

const configuredRefreshSecrets = (env: MarketRefreshEnv) =>
  [...new Set([env.ATLAS_CRON_SECRET, env.CRON_SECRET])]
    .map((secret) => (secret ?? "").trim())
    .filter((secret) => secret.length > 0);

const selectedMarketDataProvider = (env: MarketRefreshEnv) =>
  (env.MARKET_DATA_PROVIDER ?? "disabled").trim().toLowerCase() || "disabled";

const hithinkFuyaoApiKey = (env: MarketRefreshEnv) =>
  (env.HITHINK_FUYAO_API_KEY ?? env.FUYAO_TOKEN ?? env.API_KEY ?? "").trim();

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
): Promise<RefreshContext> => {
  const snapshot = await repository.getSnapshot();
  const cronSchedule = request.headers.get("x-vercel-cron-schedule") ?? undefined;

  return {
    provider: selectedMarketDataProvider(env),
    trigger: detectTrigger(request),
    cronSchedule,
    companyCount: snapshot.companies.length,
  };
};

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
}: HandleMarketRefreshInput) => {
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
      ...context,
      wouldWrite: false,
    });
  }

  if (context.provider === "disabled") {
    return json({
      status: "skipped",
      code: "provider_disabled",
      ...context,
      wouldWrite: false,
    });
  }

  if (context.provider === "hithink-fuyao" || context.provider === "fuyao") {
    if (!hithinkFuyaoApiKey(env)) {
      return json(
        {
          status: "skipped",
          code: "provider_not_configured",
          ...context,
          provider: "hithink-fuyao",
          missingEnv: ["HITHINK_FUYAO_API_KEY"],
          acceptedEnv: ["HITHINK_FUYAO_API_KEY", "FUYAO_TOKEN", "API_KEY"],
          wouldWrite: false,
        },
        { status: 503 },
      );
    }
  }

  return json(
    {
      status: "skipped",
      code: "provider_not_implemented",
      ...context,
      wouldWrite: false,
    },
    { status: 501 },
  );
};
